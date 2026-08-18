import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: Request) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const dateRange = searchParams.get("dateRange") || "Last 30 Days"

      // Calculate date range
      const days = dateRange === "Last 7 Days" ? 7 : dateRange === "Last 30 Days" ? 30 : 90
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const startIso = startDate.toISOString().split("T")[0]

      const staffPerformance = await sql`
        SELECT 
          s.id,
          s.name,
          s.role,
          COUNT(b.id) as bookings_count,
          COALESCE(SUM(b.total_amount), 0) as total_revenue,
          COALESCE(AVG(r.rating), 0) as avg_rating,
          COALESCE(
            (SELECT COUNT(*) * 100.0 / ${days} 
             FROM attendance a 
             WHERE a.staff_id = s.id 
             AND a.tenant_id = ${tenantId}
             AND a.date >= ${startIso}
             AND a.status = 'present'), 0
          ) as attendance_rate,
          COUNT(DISTINCT b.customer_id) as unique_customers,
          COUNT(bs.id) as services_completed,
          COALESCE(AVG(EXTRACT(EPOCH FROM (b.updated_at - b.created_at))/60), 0) as avg_service_time
        FROM staff s
        LEFT JOIN bookings b ON s.id = b.staff_id 
          AND b.tenant_id = ${tenantId}
          AND b.booking_date >= ${startIso}
        LEFT JOIN booking_services bs ON b.id = bs.booking_id
        LEFT JOIN reviews r ON b.id = r.booking_id
        WHERE s.is_active = true
          AND s.tenant_id = ${tenantId}
        GROUP BY s.id, s.name, s.role
        ORDER BY total_revenue DESC
      `

      const formattedData = staffPerformance.map((staff) => ({
        ...staff,
        bookings_count: Number(staff.bookings_count) || 0,
        total_revenue: Number(staff.total_revenue) || 0,
        avg_rating: Number(staff.avg_rating) || 0,
        attendance_rate: Number(staff.attendance_rate) || 0,
        customer_satisfaction: Number(staff.avg_rating) * 20, // Convert 5-star to percentage
        services_completed: Number(staff.services_completed) || 0,
        avg_service_time: Number(staff.avg_service_time) || 0,
      }))

      return NextResponse.json(formattedData)
    } catch (error) {
      console.error("Error fetching staff performance:", error)
      return NextResponse.json({ error: "Failed to fetch staff performance" }, { status: 500 })
    }
  })
}
