import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { createHash } from 'crypto'

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

    // Normalize phone
    const normalizedPhone = String(phone).replace(/[^0-9]/g, '')
    if (normalizedPhone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    // Verify tenant is active
    const tenant = await sql`
      SELECT id FROM tenants WHERE id = ${parseInt(tenantId)} AND status = 'active' LIMIT 1
    `
    if (tenant.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Create OTP table if needed
    await sql`
      CREATE TABLE IF NOT EXISTS customer_otps (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        phone VARCHAR(20) NOT NULL,
        otp_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER DEFAULT 0,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `.catch(() => {})

    // Rate limit: max 3 OTPs per phone per 10 minutes
    const recentOTPs = await sql`
      SELECT COUNT(*) as count FROM customer_otps
      WHERE tenant_id = ${parseInt(tenantId)}
        AND phone = ${normalizedPhone}
        AND created_at > NOW() - INTERVAL '10 minutes'
    `.catch(() => [{ count: 0 }])

    if (Number(recentOTPs[0]?.count) >= 3) {
      return NextResponse.json({ error: 'Too many OTP requests. Please wait 10 minutes.' }, { status: 429 })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpHash = hashOTP(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await sql`
      INSERT INTO customer_otps (tenant_id, phone, otp_hash, expires_at)
      VALUES (${parseInt(tenantId)}, ${normalizedPhone}, ${otpHash}, ${expiresAt})
    `

    // Get salon name
    const settingRow = await sql`
      SELECT setting_value FROM store_settings 
      WHERE tenant_id = ${parseInt(tenantId)} AND setting_key = 'profile.salonName' LIMIT 1
    `.catch(() => [])
    const salonName = settingRow[0]?.setting_value || 'the salon'

    // Get WA credentials
    const waConfig = await sql`
      SELECT setting_key, setting_value FROM store_settings
      WHERE tenant_id = ${parseInt(tenantId)}
        AND setting_key IN ('whatsapp.enabled', 'whatsapp.userid', 'whatsapp.password', 'whatsapp.wabaNumber')
    `.catch(() => [])

    const waSettings: Record<string, string> = {}
    waConfig.forEach((r: any) => { waSettings[r.setting_key] = r.setting_value })

    const message = `Your OTP for ${salonName} is: *${otp}*\n\nValid for 10 minutes. Do not share this code with anyone.`

    if (waSettings['whatsapp.enabled'] === 'true' && waSettings['whatsapp.userid'] && waSettings['whatsapp.wabaNumber']) {
      try {
        const formData = new FormData()
        formData.append('userid', waSettings['whatsapp.userid'])
        formData.append('password', waSettings['whatsapp.password'] || '')
        formData.append('wabaNumber', waSettings['whatsapp.wabaNumber'])
        let safePhone = normalizedPhone
        if (safePhone.length === 10) safePhone = `91${safePhone}`
        formData.append('mobile', safePhone)
        formData.append('msg', message)
        formData.append('msgType', 'text')
        formData.append('sendMethod', 'quick')
        formData.append('output', 'json')
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
        await fetch('https://waba.fonada.com/api/SendMsgOld', { method: 'POST', body: formData })
      } catch (waErr) {
        console.error('[Customer OTP] WA send failed:', waErr)
        // Non-blocking — OTP still works via DB
      }
    } else {
      // Log to console when WA not configured (dev/testing)
      console.log(`[Customer OTP] Phone: ${normalizedPhone} | OTP: ${otp}`)
    }

    return NextResponse.json({ success: true, message: 'OTP sent to your WhatsApp number' })
  } catch (error: any) {
    console.error('[Customer OTP] Error:', error)
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }
}
