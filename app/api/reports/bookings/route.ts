import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
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
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN staff s ON b.staff_id = s.id
      WHERE b.booking_date >= ${startIso}
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
}
