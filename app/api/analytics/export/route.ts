import { NextResponse } from "next/server"
import { getBusinessAnalytics } from "@/app/actions/analytics"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get("dateRange") || "30"

    const analyticsData = await getBusinessAnalytics(dateRange)

    // Convert to CSV format
    const csvData = [
      ["Metric", "Value", "Growth %"],
      [
        "Total Revenue",
        `₹${analyticsData.totalRevenue.toLocaleString()}`,
        `${analyticsData.revenueGrowth.toFixed(1)}%`,
      ],
      ["Total Customers", analyticsData.totalCustomers.toString(), `${analyticsData.customerGrowth.toFixed(1)}%`],
      ["Total Bookings", analyticsData.totalBookings.toString(), `${analyticsData.bookingGrowth.toFixed(1)}%`],
      [
        "Avg Service Time",
        `${analyticsData.avgServiceTime.toFixed(0)}m`,
        `${analyticsData.serviceTimeImprovement.toFixed(1)}%`,
      ],
      ["Avg Transaction Value", `₹${analyticsData.avgTransactionValue.toLocaleString()}`, ""],
      ["Repeat Customer Rate", `${analyticsData.repeatCustomerRate.toFixed(1)}%`, ""],
      ["Monthly Recurring Revenue", `₹${analyticsData.monthlyRecurringRevenue.toLocaleString()}`, ""],
      [],
      ["Top Services", "Bookings", "Revenue"],
      ...analyticsData.topServices.map((s) => [s.name, s.bookings.toString(), `₹${s.revenue.toLocaleString()}`]),
      [],
      ["Staff Performance", "Bookings", "Revenue"],
      ...analyticsData.staffPerformance.map((s) => [s.name, s.bookings.toString(), `₹${s.revenue.toLocaleString()}`]),
    ]

    const csv = csvData.map((row) => row.join(",")).join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="analytics-report-${dateRange}days.csv"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Failed to export analytics data" }, { status: 500 })
  }
}
