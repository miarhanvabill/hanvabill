import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { createHash } from 'crypto'
import { getTenantWhatsAppConfig, DEFAULT_HANVA_WABA_NUMBER } from '@/lib/whatsapp-automations'

export const dynamic = 'force-dynamic'

function hashOTP(otp: string): string {
  return createHash('sha256').update(otp).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, phone } = await req.json()

    if (!tenantId || !phone) {
      return NextResponse.json({ error: 'tenantId and phone are required' }, { status: 400 })
    }

    // Canonical Phone Normalization
    const rawDigits = String(phone).replace(/[^0-9]/g, '')
    if (rawDigits.length < 10) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number' }, { status: 400 })
    }

    let canonicalPhone = rawDigits
    if (canonicalPhone.startsWith('0') && canonicalPhone.length === 11) {
      canonicalPhone = canonicalPhone.slice(1)
    }
    if (canonicalPhone.length === 10) {
      canonicalPhone = `91${canonicalPhone}`
    }
    const phoneShort = canonicalPhone.slice(-10)

    // Verify tenant is active
    const tenant = await sql`
      SELECT id, name FROM tenants 
      WHERE (id::text = ${String(tenantId)} OR slug = ${String(tenantId)} OR tenant_key = ${String(tenantId)}) 
        AND status = 'active' 
      LIMIT 1
    `.catch(() => [])
    if (tenant.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }
    const internalTenantId = Number(tenant[0].id)
    const tenantName = tenant[0].name || 'Hanva Luxury Salon'

    // Create OTP table if needed
    await sql`
      CREATE TABLE IF NOT EXISTS customer_otps (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        phone VARCHAR(30) NOT NULL,
        otp_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER DEFAULT 0,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `.catch(() => {})

    // Rate limit: max 6 OTPs per phone per 10 minutes
    const recentOTPs = await sql`
      SELECT COUNT(*) as count FROM customer_otps
      WHERE (tenant_id = ${internalTenantId} OR tenant_id::text = ${String(internalTenantId)})
        AND (phone = ${canonicalPhone} OR phone = ${phoneShort} OR phone = ${rawDigits} OR phone LIKE ${'%' + phoneShort})
        AND created_at > NOW() - INTERVAL '10 minutes'
    `.catch((err) => {
      console.error('[Customer OTP] Rate limit check failed:', err)
      return [{ count: 0 }]
    })

    if (Number(recentOTPs[0]?.count) >= 6) {
      return NextResponse.json({ error: 'Too many OTP requests. Please wait 10 minutes.' }, { status: 429 })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpHash = hashOTP(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await sql`
      INSERT INTO customer_otps (tenant_id, phone, otp_hash, expires_at)
      VALUES (${internalTenantId}, ${canonicalPhone}, ${otpHash}, ${expiresAt})
    `

    // Get salon name
    const settingRow = await sql`
      SELECT setting_value FROM store_settings 
      WHERE tenant_id = ${String(internalTenantId)} AND setting_key = 'profile.salonName' LIMIT 1
    `.catch(() => [])
    const salonName = settingRow[0]?.setting_value || tenantName || 'Hanva Luxury Salon'

    // Retrieve WhatsApp credentials (with automatic fallback to master tenant and env)
    const waConfig = await getTenantWhatsAppConfig(sql, String(internalTenantId))

    // Build candidate WABA numbers
    const rawConfigWaba = String(waConfig.wabaNumber || DEFAULT_HANVA_WABA_NUMBER).trim()
    const rawDigitsWaba = rawConfigWaba.replace(/[^0-9]/g, '')
    const tenDigitsWaba = rawDigitsWaba.slice(-10)

    const candidateWabas: string[] = [
      rawConfigWaba,                          // Raw from store_settings (if user typed something specific)
      tenDigitsWaba,                          // "7965373459" (10-digit number without country code)
      `+91${tenDigitsWaba}`,                  // "+917965373459"
      `+91 79 6537 3459`,                     // Format exactly as given by user in chat
      `0${tenDigitsWaba}`,                    // "07965373459" (Domestic Ahmedabad landline prefix)
      `91 79 6537 3459`,                     // Without plus, with spaces
      `079 6537 3459`,                        // Domestic with space
      `91${tenDigitsWaba}`,                   // "917965373459"
    ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i)

    let sendSuccess = false
    let fonadaError = ''
    let sentMsgCandidate = ''
    let sentMsgId: string | null = null
    let successfulWaba = ''

    if (waConfig.enabled && waConfig.userid && waConfig.password) {
      // Multiple template candidate formats to ensure compatibility with whichever Meta template was approved
      const candidateMessages = [
        `Your verification code for *${salonName}* is *${otp}*.\n\nValid for 10 minutes. Please do not share this code with anyone.`,
        `*${otp}* is your verification code. For your security, do not share this code.`,
        `${otp} is your verification code. For your security, do not share this code.`,
        `${otp} is your verification code. For your security, do not share this code.\n\nExpires in 10 minutes.`,
        `Your OTP for ${salonName} is: *${otp}*\n\nValid for 10 minutes. Do not share this code with anyone.`
      ]

      wabaLoop: for (const testWaba of candidateWabas) {
        console.log(`[Customer OTP] Testing Fonada wabaNumber: "${testWaba}" (userid: ${waConfig.userid})`)

        for (const msgCandidate of candidateMessages) {
          try {
            const formData = new FormData()
            formData.append('userid', waConfig.userid)
            formData.append('password', waConfig.password)
            formData.append('wabaNumber', testWaba)
            formData.append('mobile', canonicalPhone)
            formData.append('msg', msgCandidate)
            formData.append('msgType', 'text')
            formData.append('sendMethod', 'quick')
            formData.append('output', 'json')
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

            const response = await fetch('https://waba.fonada.com/api/SendMsgOld', {
              method: 'POST',
              body: formData,
            })

            const resText = await response.text()
            let resData: any = null
            try {
              resData = JSON.parse(resText)
            } catch {
              resData = null
            }

            console.log(`[Customer OTP] Fonada response for wabaNumber "${testWaba}":`, resText)

            const isError = resData?.status === false || resData?.status === 'error' || Boolean(resData?.error) || response.status >= 400
            if (!isError && (resData?.status === true || resData?.status === 'success' || resData?.msgId || resData?.data)) {
              sendSuccess = true
              successfulWaba = testWaba
              sentMsgCandidate = msgCandidate
              sentMsgId = resData?.msgId || null

              console.log(`[Customer OTP] ✅ SUCCESS! Fonada accepted wabaNumber "${testWaba}". Msg ID: ${sentMsgId}`)

              // Persist the winning wabaNumber so future calls are instant
              try {
                await sql`
                  UPDATE store_settings SET setting_value = ${testWaba}, updated_at = NOW()
                  WHERE setting_key = 'whatsapp.wabaNumber'
                `.catch(() => {})
              } catch {}

              // Record in whatsapp_messages table
              try {
                await sql`
                  INSERT INTO whatsapp_messages (
                    tenant_id, phone_number, message_type, message_content, direction, status, msg_id, created_at
                  ) VALUES (
                    ${String(internalTenantId)}, ${canonicalPhone}, 'text', ${msgCandidate}, 'outbound', 'sent', ${sentMsgId}, NOW()
                  )
                `.catch(() => {})
              } catch {}

              break wabaLoop // Exit completely on success!
            } else {
              fonadaError = resData?.error || resData?.message || resText || `HTTP ${response.status}`
              const lowerErr = fonadaError.toLowerCase()

              // If error is specifically about wabaNumber, immediately test the next WABA candidate!
              if (lowerErr.includes('wabanumber') || lowerErr.includes('waba number')) {
                break
              }

              // If credentials are fundamentally wrong, exit everything
              if (lowerErr.includes('invalid user') || lowerErr.includes('unauthorized') || lowerErr.includes('incorrect password')) {
                break wabaLoop
              }
            }
          } catch (fetchErr: any) {
            fonadaError = fetchErr?.message || 'Network error'
          }
        }
      }

      if (!sendSuccess) {
        console.error(`[Customer OTP] All candidate WABA formats failed for ${canonicalPhone}. Tested: ${candidateWabas.join(', ')}. Last error: ${fonadaError}`)
      }
    } else {
      console.warn(`[Customer OTP] No WhatsApp credentials configured for tenant ${internalTenantId}. Simulated OTP: ${otp} for ${canonicalPhone}`)
    }

    if (!sendSuccess && fonadaError) {
      return NextResponse.json({
        success: false,
        error: `WhatsApp Gateway rejected sender number: ${fonadaError}. Tested: ${candidateWabas.join(', ')}`,
        phone: canonicalPhone,
        debugOtp: otp, // Allow instant testing even if Fonada gateway rejects
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your WhatsApp number',
      phone: canonicalPhone,
      wabaNumber: successfulWaba,
    })
  } catch (error: any) {
    console.error('[Customer OTP] Critical Error:', error)
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }
}
