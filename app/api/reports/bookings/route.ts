import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: Request) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const dateRange = searchParams.get("dateRange") || "Last 7 Days"
      const status = searchParams.get("status") || "All"

      // Calculate date range
      const days = dateRange === "Last 7 Days" ? 7 : dateRange === "Last 30 Days" ? 30 : 90
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const startIso = startDate.toISOString().split("T")[0]

      // Build status filter
      const statusFilter = status === "All" ? "" : `AND b.status = '${status}'`

      const bookings = await sql`
        SELECT 
          b.id,
          b.booking_number,
          b.booking_date,
          b.booking_time,
          b.status,
          b.total_amount,
          b.payment_method,
          c.full_name as customer_name,
          s.name as staff_name,
          b.service_names
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
        LEFT JOIN staff s ON b.staff_id = s.id AND s.tenant_id = ${tenantId}
        WHERE b.booking_date >= ${startIso}
        AND b.tenant_id = ${tenantId}
        ${statusFilter ? sql.unsafe(statusFilter) : sql``}
        ORDER BY b.booking_date DESC, b.booking_time DESC
      `

      const formattedBookings = bookings.map((booking) => ({
        ...booking,
        service_names: booking.service_names || [],
        total_amount: Number(booking.total_amount) || 0,
        customer_name: booking.customer_name || "Unknown Customer",
        staff_name: booking.staff_name || "Unassigned",
      }))

      return NextResponse.json(formattedBookings)
    } catch (error) {
      console.error("Error fetching bookings report:", error)
      return NextResponse.json({ error: "Failed to fetch bookings report" }, { status: 500 })
    }
  })
}
