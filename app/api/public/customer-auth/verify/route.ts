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

    const normalizedPhone = String(phone).replace(/[^0-9]/g, '')
    const otpHash = hashOTP(String(otp))

    // Find valid, unverified OTP record
    const otpRecord = await sql`
      SELECT id, attempts FROM customer_otps
      WHERE tenant_id = ${parseInt(tenantId)}
        AND phone = ${normalizedPhone}
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
    const matched = await sql`
      SELECT id FROM customer_otps WHERE id = ${record.id} AND otp_hash = ${otpHash}
    `.catch(() => [])

    if (matched.length === 0) {
      return NextResponse.json({ error: 'Invalid OTP. Please try again.' }, { status: 400 })
    }

    // Mark as verified
    await sql`UPDATE customer_otps SET verified = TRUE WHERE id = ${record.id}`.catch(() => {})

    // Look up customer by phone (try multiple formats)
    const phoneShort = normalizedPhone.slice(-10)
    const customerRows = await sql`
      SELECT id, full_name, phone_number, email, date_of_birth, date_of_anniversary, gender
      FROM customers
      WHERE tenant_id = ${parseInt(tenantId)}
        AND (
          phone_number = ${normalizedPhone}
          OR phone_number = ${'+' + normalizedPhone}
          OR phone_number = ${'91' + phoneShort}
          OR phone_number = ${'+91' + phoneShort}
          OR phone_number LIKE ${'%' + phoneShort}
        )
      LIMIT 1
    `.catch(() => [])

    let customer: any

    if (customerRows.length === 0) {
      // New customer — create record
      const newCustomer = await sql`
        INSERT INTO customers (tenant_id, phone_number, full_name, created_at)
        VALUES (${parseInt(tenantId)}, ${normalizedPhone}, ${'Customer'}, NOW())
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
      tenantId: parseInt(tenantId),
      phone: normalizedPhone,
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
