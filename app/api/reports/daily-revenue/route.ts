import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get("dateRange") || "Last 7 Days"

    // Calculate date range
    const days = dateRange === "Last 7 Days" ? 7 : dateRange === "Last 30 Days" ? 30 : 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startIso = startDate.toISOString().split("T")[0]

    const dailyRevenue = await sql`
      SELECT 
        booking_date::text as date,
        COUNT(*) as booking_count,
        COALESCE(SUM(total_amount), 0) as revenue,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount * 0.1 ELSE 0 END), 0) as tips,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END), 0) as total_outstanding,
        COALESCE(SUM(CASE WHEN status = 'completed' AND payment_method = 'pending' THEN total_amount ELSE 0 END), 0) as collected_outstanding
      FROM bookings
      WHERE booking_date >= ${startIso}
      AND status IN ('completed', 'confirmed', 'pending')
      GROUP BY booking_date
      ORDER BY booking_date DESC
    `

    const formattedData = dailyRevenue.map((day) => ({
      date: day.date,
      bookingCount: Number(day.booking_count) || 0,
      revenue: Number(day.revenue) || 0,
      tips: Number(day.tips) || 0,
      totalOutstanding: Number(day.total_outstanding) || 0,
      collectedOutstanding: Number(day.collected_outstanding) || 0,
    }))

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error("Error fetching daily revenue:", error)
    return NextResponse.json({ error: "Failed to fetch daily revenue" }, { status: 500 })
  }
}
