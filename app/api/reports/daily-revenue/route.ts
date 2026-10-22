import { type NextRequest, NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { parseReportDates } from "@/lib/report-dates"

export async function GET(request: NextRequest) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const dateRange = searchParams.get("dateRange") || "Last 7 Days"
      const startDateParam = searchParams.get("startDate")
      const endDateParam = searchParams.get("endDate")

      const { startIso, endIso } = parseReportDates(dateRange, startDateParam, endDateParam)
      
      const dailyRevenue = await sql`
        SELECT 
          TO_CHAR(booking_date::TIMESTAMP, 'YYYY-MM-DD') as date,
          COUNT(id) as bookingCount,
          COALESCE(SUM(total_amount), 0) as revenue,
          0 as tips,
          0 as totalOutstanding,
          0 as collectedOutstanding
        FROM bookings
        WHERE tenant_id = ${tenantId}
          AND status = 'completed'
          AND booking_date >= ${startIso}
          AND booking_date <= ${endIso}
        GROUP BY TO_CHAR(booking_date::TIMESTAMP, 'YYYY-MM-DD')
        ORDER BY date DESC
      `
      
      const response = dailyRevenue.map((row: any) => ({
        date: row.date,
        bookingCount: Number(row.bookingcount || row.bookingCount) || 0,
        revenue: Number(row.revenue) || 0,
        tips: 0,
        totalOutstanding: 0,
        collectedOutstanding: 0,
      }))

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
