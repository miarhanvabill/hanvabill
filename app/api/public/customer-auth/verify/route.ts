import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { createHash } from 'crypto'
import { signCustomerToken } from '@/lib/customer-jwt'

export const dynamic = 'force-dynamic'

function hashOTP(otp: string): string {
  return createHash('sha256').update(otp).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, phone, otp } = await req.json()

    if (!tenantId || !phone || !otp) {
      return NextResponse.json({ error: 'tenantId, phone, and otp are required' }, { status: 400 })
    }

    // Resolve tenant ID safely
    const tenant = await sql`
      SELECT id FROM tenants 
      WHERE (id::text = ${String(tenantId)} OR slug = ${String(tenantId)} OR tenant_key = ${String(tenantId)}) 
        AND status = 'active' 
      LIMIT 1
    `.catch(() => [])
    if (tenant.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }
    const internalTenantId = Number(tenant[0].id)

    // Canonical Phone Normalization
    const rawDigits = String(phone).replace(/[^0-9]/g, '')
    let canonicalPhone = rawDigits
    if (canonicalPhone.startsWith('0') && canonicalPhone.length === 11) {
      canonicalPhone = canonicalPhone.slice(1)
    }
    if (canonicalPhone.length === 10) {
      canonicalPhone = `91${canonicalPhone}`
    }
    const phoneShort = canonicalPhone.slice(-10)

    const otpHash = hashOTP(String(otp).trim())

    // Find valid, unverified OTP record matching any compatible phone representation
    const otpRecord = await sql`
      SELECT id, attempts, otp_hash FROM customer_otps
      WHERE (tenant_id = ${internalTenantId} OR tenant_id::text = ${String(internalTenantId)} OR tenant_id::text = ${String(tenantId)})
        AND (
          phone = ${canonicalPhone}
          OR phone = ${rawDigits}
          OR phone = ${phoneShort}
          OR phone = ${'91' + phoneShort}
          OR phone = ${'+91' + phoneShort}
          OR phone LIKE ${'%' + phoneShort}
        )
        AND expires_at > NOW()
        AND verified = FALSE
      ORDER BY created_at DESC
      LIMIT 1
    `.catch(() => [])

    if (otpRecord.length === 0) {
      return NextResponse.json({ error: 'OTP expired or not found. Please request a new one.' }, { status: 400 })
    }

    const record = otpRecord[0]

    if (record.attempts >= 5) {
      return NextResponse.json({ error: 'Too many failed attempts. Please request a new OTP.' }, { status: 400 })
    }

    // Increment attempts
    await sql`UPDATE customer_otps SET attempts = attempts + 1 WHERE id = ${record.id}`.catch(() => {})

    // Verify the hash matches
    if (record.otp_hash !== otpHash) {
      return NextResponse.json({ error: 'Invalid OTP. Please check your WhatsApp and try again.' }, { status: 400 })
    }

    // Mark as verified
    await sql`UPDATE customer_otps SET verified = TRUE WHERE id = ${record.id}`.catch(() => {})

    // Look up customer by phone (try multiple standard formats)
    const customerRows = await sql`
      SELECT id, full_name, phone_number, email, date_of_birth, date_of_anniversary, gender
      FROM customers
      WHERE (tenant_id = ${internalTenantId} OR tenant_id::text = ${String(internalTenantId)} OR tenant_id::text = ${String(tenantId)})
        AND (
          phone_number = ${canonicalPhone}
          OR phone_number = ${'+' + canonicalPhone}
          OR phone_number = ${rawDigits}
          OR phone_number = ${phoneShort}
          OR phone_number = ${'+91' + phoneShort}
          OR phone_number = ${'91' + phoneShort}
          OR phone_number LIKE ${'%' + phoneShort}
        )
      LIMIT 1
    `.catch(() => [])

    let customer: any

    if (customerRows.length === 0) {
      // New customer — create record with canonical phone
      const newCustomer = await sql`
        INSERT INTO customers (tenant_id, phone_number, full_name, created_at)
        VALUES (${internalTenantId}, ${canonicalPhone}, ${'Customer'}, NOW())
        RETURNING id, full_name, phone_number, email, date_of_birth, date_of_anniversary, gender
      `.catch(() => [])
      customer = newCustomer[0]
    } else {
      customer = customerRows[0]
    }

    if (!customer) {
      return NextResponse.json({ error: 'Could not create or find customer record' }, { status: 500 })
    }

    // Sign 7-day JWT
    const token = signCustomerToken({
      customerId: Number(customer.id),
      tenantId: internalTenantId,
      phone: canonicalPhone,
      name: customer.full_name || 'Customer'
    })

    return NextResponse.json({
      success: true,
      token,
      customer: {
        id: customer.id,
        name: customer.full_name,
        phone: customer.phone_number,
        email: customer.email,
        date_of_birth: customer.date_of_birth,
        date_of_anniversary: customer.date_of_anniversary,
        gender: customer.gender
      }
    })
  } catch (error: any) {
    console.error('[Customer OTP Verify] Error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
