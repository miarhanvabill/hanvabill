import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyCustomerToken } from '@/lib/customer-jwt'

export const dynamic = 'force-dynamic'

async function getPayload(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '').trim()
  if (!token) return null
  return verifyCustomerToken(token)
}

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customerId, tenantId } = payload

    // Customer details
    const customerRows = await sql`
      SELECT id, full_name, phone_number, email, date_of_birth, date_of_anniversary, gender
      FROM customers
      WHERE id = ${customerId} AND tenant_id = ${tenantId}
      LIMIT 1
    `
    if (customerRows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    const customer = customerRows[0]

    // Loyalty points balance
    const loyaltyRows = await sql`
      SELECT
        COALESCE(SUM(CASE 
          WHEN transaction_type IN ('earned', 'bonus', 'referral', 'welcome') THEN points 
          WHEN transaction_type IN ('redeemed', 'expired') THEN -points 
          ELSE 0 
        END), 0) AS current_points,
        COALESCE(SUM(CASE WHEN transaction_type = 'earned' THEN points ELSE 0 END), 0) AS total_earned
      FROM loyalty_transactions
      WHERE customer_id = ${customerId} AND tenant_id = ${tenantId}
        AND (expires_at IS NULL OR expires_at > NOW())
    `.catch(() => [{ current_points: 0, total_earned: 0 }])
    const loyalty = loyaltyRows[0] || { current_points: 0, total_earned: 0 }

    // Booking history (last 10)
    const bookings = await sql`
      SELECT
        b.id, b.booking_number, b.booking_date, b.booking_time,
        b.status, b.total_amount,
        s.name AS staff_name,
        STRING_AGG(DISTINCT sv.name, ', ') AS service_names
      FROM bookings b
      LEFT JOIN staff s ON b.staff_id = s.id AND s.tenant_id = ${tenantId}
      LEFT JOIN booking_services bs ON b.id = bs.booking_id
      LEFT JOIN services sv ON bs.service_id = sv.id AND sv.tenant_id = ${tenantId}
      WHERE b.customer_id = ${customerId} AND b.tenant_id = ${tenantId}
      GROUP BY b.id, b.booking_number, b.booking_date, b.booking_time, b.status, b.total_amount, s.name
      ORDER BY b.booking_date DESC, b.booking_time DESC
      LIMIT 10
    `.catch(() => [])

    // Active memberships
    const memberships = await sql`
      SELECT cm.id, m.name, m.description, cm.start_date, cm.end_date, cm.status
      FROM customer_memberships cm
      JOIN memberships m ON cm.membership_id = m.id AND m.tenant_id = ${tenantId}
      WHERE cm.customer_id = ${customerId} AND cm.tenant_id = ${tenantId}
        AND cm.status = 'active'
        AND (cm.end_date IS NULL OR cm.end_date >= CURRENT_DATE)
    `.catch(() => [])

    // Active packages
    const packages = await sql`
      SELECT cp.id, p.name, cp.sessions_remaining, cp.expiry_date
      FROM customer_packages cp
      JOIN packages p ON cp.package_id = p.id AND p.tenant_id = ${tenantId}
      WHERE cp.customer_id = ${customerId} AND cp.tenant_id = ${tenantId}
        AND cp.sessions_remaining > 0
        AND (cp.expiry_date IS NULL OR cp.expiry_date >= CURRENT_DATE)
    `.catch(() => [])

    // Wallet balance
    const walletRows = await sql`
      SELECT COALESCE(SUM(
        CASE WHEN type IN ('earned', 'bonus', 'refund') THEN points
             WHEN type IN ('redeemed') THEN -points
             ELSE 0 END
      ), 0) AS balance
      FROM wallet_transactions
      WHERE customer_id = ${customerId} AND tenant_id = ${tenantId}
    `.catch(() => [{ balance: 0 }])

    // Referral code
    const referralCode = `REF${String(customerId).padStart(4, '0')}${String(payload.phone).slice(-4)}`
    const referralRows = await sql`
      SELECT COUNT(*) as count FROM customers
      WHERE referral_code = ${referralCode} AND tenant_id = ${tenantId}
    `.catch(() => [{ count: 0 }])

    return NextResponse.json({
      success: true,
      customer,
      loyalty: {
        current_points: Math.max(0, Number(loyalty.current_points)),
        total_earned: Number(loyalty.total_earned)
      },
      bookings,
      memberships,
      packages,
      wallet_balance: Math.max(0, Number(walletRows[0]?.balance || 0)),
      referral: {
        code: referralCode,
        referrals_count: Number(referralRows[0]?.count || 0)
      }
    })
  } catch (error: any) {
    console.error('[Customer Profile GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const payload = await getPayload(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customerId, tenantId } = payload
    const body = await req.json()
    const { name, email, date_of_birth, date_of_anniversary, gender } = body

    await sql`
      UPDATE customers SET
        full_name = COALESCE(NULLIF(${name || ''}, ''), full_name),
        email = COALESCE(NULLIF(${email || ''}, ''), email),
        date_of_birth = CASE WHEN ${date_of_birth || ''} != '' THEN ${date_of_birth || null}::date ELSE date_of_birth END,
        date_of_anniversary = CASE WHEN ${date_of_anniversary || ''} != '' THEN ${date_of_anniversary || null}::date ELSE date_of_anniversary END,
        gender = COALESCE(NULLIF(${gender || ''}, ''), gender),
        updated_at = NOW()
      WHERE id = ${customerId} AND tenant_id = ${tenantId}
    `

    return NextResponse.json({ success: true, message: 'Profile updated successfully' })
  } catch (error: any) {
    console.error('[Customer Profile PATCH] Error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
