import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { Redis } from "@upstash/redis"

const redis = process.env.KV_REST_API_URL
  ? new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null

export async function POST(req: Request) {
  return await withTenantAuth(async ({ sql, tenantId }, user) => {
    try {
      // Check user permissions (admin, owner, staff can create bookings)
      if (!user.roles.some(role => ["admin", "owner", "staff"].includes(role))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }

      const {
        customer_id,
        service_id,
        staff_id,
        booking_date,
        booking_time,
        status = "confirmed",
        notes = "",
        amount = 0,
      } = await req.json()

      if (!customer_id || !service_id || !booking_date || !booking_time) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      const rows = await sql`
        INSERT INTO bookings (
          tenant_id, customer_id, service_id, staff_id, 
          booking_date, booking_time, status, notes, amount
        )
        SELECT 
          ${tenantId}, ${customer_id}, ${service_id}, ${staff_id}, 
          ${booking_date}, ${booking_time}, ${status}, ${notes}, ${amount}
        WHERE EXISTS (
          SELECT 1 FROM customers WHERE id = ${customer_id} AND tenant_id = ${tenantId}
        )
        AND EXISTS (
          SELECT 1 FROM services WHERE id = ${service_id} AND tenant_id = ${tenantId}
        )
        AND (
          ${staff_id} IS NULL OR EXISTS (
            SELECT 1 FROM staff WHERE id = ${staff_id} AND tenant_id = ${tenantId}
          )
        )
        RETURNING 
          id, tenant_id, customer_id, service_id, staff_id, 
          booking_date, booking_time, status, notes, amount, created_at
      `

      if (!rows.length) {
        return NextResponse.json({ 
          error: "Invalid customer, service, or staff ID for this tenant" 
        }, { status: 400 })
      }

      // Invalidate tenant-scoped caches
      if (redis) {
        await redis.del(`tenant:${tenantId}:bookings:list`)
        await redis.del(`tenant:${tenantId}:dashboard:stats`)
      }

      return NextResponse.json({ success: true, booking: rows[0] }, { status: 201 })
    } catch (error: any) {
      console.error("[v0] Booking creation error:", error)

      if (error instanceof Response) {
        return error
      }

      return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 })
    }
  })
}

export async function GET(req: Request) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      // Try Redis cache first
      if (redis) {
        const cached = await redis.get(`tenant:${tenantId}:bookings:list`)
        if (cached) {
          return NextResponse.json({ bookings: cached })
        }
      }

      const rows = await sql`
        SELECT 
          b.*, 
          c.name as customer_name, 
          s.name as service_name, 
          st.name as staff_name
        FROM bookings b
        LEFT JOIN customers c 
          ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
        LEFT JOIN services s 
          ON b.service_id = s.id AND s.tenant_id = ${tenantId}
        LEFT JOIN staff st 
          ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
        WHERE b.tenant_id = ${tenantId}
        ORDER BY b.booking_date DESC, b.booking_time DESC
        LIMIT 100
      `

      // Cache for 5 minutes
      if (redis) {
        await redis.setex(`tenant:${tenantId}:bookings:list`, 300, rows)
      }

      return NextResponse.json({ bookings: rows })
    } catch (error: any) {
      console.error("[v0] Bookings fetch error:", error)

      if (error instanceof Response) {
        return error
      }

      return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 })
    }
  })
}
