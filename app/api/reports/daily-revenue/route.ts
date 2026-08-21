import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const dateRange = searchParams.get("dateRange") || "Last 7 Days"

      // Calculate days
      const days = dateRange === "Last 7 Days" ? 7 : dateRange === "Last 30 Days" ? 30 : 90
      
      const dailyRevenue = await sql`
        SELECT 
          TO_CHAR(booking_date, 'YYYY-MM-DD') as date,
          COUNT(id) as bookingCount,
          COALESCE(SUM(total_amount), 0) as revenue,
          0 as tips,
          0 as totalOutstanding,
          0 as collectedOutstanding
        FROM bookings
        WHERE tenant_id = ${tenantId}
          AND status = 'completed'
          AND booking_date >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY booking_date
        ORDER BY booking_date DESC
      `
      
      const response = dailyRevenue.map(row => ({
        date: row.date,
        bookingCount: Number(row.bookingcount),
        revenue: Number(row.revenue),
        tips: 0,
        totalOutstanding: 0,
        collectedOutstanding: 0
      }));

      return NextResponse.json(response, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
    } catch (error) {
      console.error("Error fetching daily revenue:", error)
      return NextResponse.json({ error: "Failed to fetch daily revenue data" }, { status: 500 })
    }
  })
}
