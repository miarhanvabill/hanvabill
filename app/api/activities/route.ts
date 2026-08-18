import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { getAuth } from "@clerk/nextjs/server"

export async function GET(request: NextRequest) {
  try {
    // 🔑 Get Clerk auth session
    const { userId, sessionClaims } = getAuth(request)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Tenant ID stored in Clerk metadata (set during onboarding)
    const tenantId = sessionClaims?.metadata?.tenant_id as string | undefined
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 403 })
    }

    return await withTenantAuth(async ({ sql }) => {
      const { searchParams } = new URL(request.url)
      const search = searchParams.get("search") || ""
      const status = searchParams.get("status") || "all"
      const type = searchParams.get("type") || "all"
      const date = searchParams.get("date") || "today"

      let dateFilter = ""
      const today = new Date().toISOString().split("T")[0]

      switch (date) {
        case "today":
          dateFilter = `AND DATE(b.booking_date) = '${today}'`
          break
        case "week":
          dateFilter = `AND b.booking_date >= DATE('${today}') - INTERVAL '7 days'`
          break
        case "month":
          dateFilter = `AND b.booking_date >= DATE('${today}') - INTERVAL '30 days'`
          break
        default:
          dateFilter = ""
      }

      const searchFilter = search
        ? `
        AND (c.full_name ILIKE '%${search}%'
             OR c.phone_number ILIKE '%${search}%'
             OR b.booking_number ILIKE '%${search}%')
      `
        : ""

      const statusFilter = status !== "all" ? `AND b.status = '${status}'` : ""

      const bookingQuery = `
        SELECT
          'booking' as type,
          b.id,
          b.booking_number as reference_number,
          c.full_name as customer_name,
          c.phone_number as customer_phone,
          s.name as staff_name,
          s.role as staff_role,
          STRING_AGG(srv.name, ', ') as service_names,
          b.total_amount as amount,
          b.status,
          CASE
            WHEN b.status = 'completed' THEN b.booking_time
            ELSE ''
          END as completion_time,
          b.booking_date,
          b.booking_time,
          b.notes,
          b.created_at
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
        LEFT JOIN staff s ON b.staff_id = s.id AND s.tenant_id = ${tenantId}
        LEFT JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
        LEFT JOIN services srv ON bs.service_id = srv.id AND srv.tenant_id = ${tenantId}
        WHERE b.tenant_id = ${tenantId} ${dateFilter} ${searchFilter} ${statusFilter}
        GROUP BY b.id, c.full_name, c.phone_number, s.name, s.role, b.total_amount,
                 b.status, b.booking_time, b.booking_date, b.notes, b.created_at, b.booking_number
      `

      let activities: any[] = []

      if (type === "all" || type === "booking") {
        const bookings = await sql`${bookingQuery}`
        activities = [...activities, ...bookings]
      }

      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      const statsQuery = await sql`
        SELECT
          COUNT(*) as total_today,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_today,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_confirmations,
          COALESCE(SUM(CASE WHEN status IN ('completed', 'confirmed') THEN total_amount ELSE 0 END), 0) as total_revenue_today
        FROM bookings
        WHERE tenant_id = ${tenantId} AND DATE(booking_date) = CURRENT_DATE
      `

      const stats = statsQuery[0] || {
        total_today: 0,
        completed_today: 0,
        pending_confirmations: 0,
        total_revenue_today: 0,
      }

      return NextResponse.json({
        activities: activities.map((activity) => ({
          ...activity,
          service_names: activity.service_names ? activity.service_names.split(", ") : [],
          amount: Number(activity.amount) || 0,
        })),
        stats: {
          total_today: Number(stats.total_today),
          completed_today: Number(stats.completed_today),
          pending_confirmations: Number(stats.pending_confirmations),
          total_revenue_today: Number(stats.total_revenue_today),
        },
      })
    }, { tenantId })
  } catch (error) {
    console.error("Error fetching activities:", error)
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
  }
}
