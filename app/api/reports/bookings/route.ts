import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: Request) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const dateRange = searchParams.get("dateRange") || "Last 7 Days"
      const status = searchParams.get("status") || "All"

      // Calculate date range
      let days = 30;
      if (dateRange === "Today") days = 0;
      else if (dateRange === "Yesterday") days = 1;
      else if (dateRange === "Last 7 Days" || dateRange === "This Week") days = 7;
      else if (dateRange === "Last 30 Days" || dateRange === "This Month") days = 30;
      else if (dateRange === "Last 90 Days" || dateRange === "Last 3 Months") days = 90;
      else if (dateRange === "Last 6 Months") days = 180;
      else if (dateRange === "Last 12 Months" || dateRange === "This Year") days = 365;
      let startIso: string
      let endIso: string | null = null

      if (dateRange === "Today") {
        startIso = new Date().toISOString().split("T")[0]
      } else if (dateRange === "Yesterday") {
        const y = new Date()
        y.setDate(y.getDate() - 1)
        startIso = y.toISOString().split("T")[0]
        endIso = new Date().toISOString().split("T")[0]
      } else {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        startIso = startDate.toISOString().split("T")[0]
      }

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
          b.service_names,
          (
            SELECT array_agg(srv.name)
            FROM booking_services bs
            JOIN services srv ON bs.service_id = srv.id
            WHERE bs.booking_id = b.id
          ) as rel_service_names
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
        LEFT JOIN staff s ON b.staff_id = s.id AND s.tenant_id = ${tenantId}
        WHERE b.booking_date >= ${startIso}
        ${endIso ? sql`AND b.booking_date < ${endIso}` : sql``}
        AND b.tenant_id = ${tenantId}
        ${status !== "All" ? sql`AND b.status = ${status}` : sql``}
        ORDER BY b.booking_date DESC, b.booking_time DESC
      `

      const formattedBookings = bookings.map((booking: any) => ({
        ...booking,
        service_names: Array.isArray(booking.rel_service_names) && booking.rel_service_names.length > 0 
          ? booking.rel_service_names 
          : (booking.service_names || []),
        total_amount: Number(booking.total_amount) || 0,
        customer_name: booking.customer_name || "Unknown Customer",
        staff_name: booking.staff_name || "Unassigned",
        payment_method: booking.status === "pending" && booking.payment_method === "cash" ? "unpaid" : booking.payment_method,
      }))

      return NextResponse.json(formattedBookings)
    } catch (error) {
      console.error("Error fetching bookings report:", error)
      return NextResponse.json({ error: "Failed to fetch bookings report" }, { status: 500 })
    }
  })
}
