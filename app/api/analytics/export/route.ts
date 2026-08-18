import { type NextRequest, NextResponse } from "next/server"
import { getBusinessAnalytics } from "@/app/actions/analytics"
import { withTenantAuth } from "@/lib/withTenantAuth"

function escapeCSVValue(value: string | number): string {
  if (typeof value === "number") return value.toString()
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get("dateRange") || "30"

    // Use withTenantAuth to get tenant context and SQL client
    const analyticsData = await withTenantAuth(async ({ sql, tenantId }) => {
      return await getBusinessAnalytics(dateRange, tenantId, sql)
    })

    // Prepare CSV rows
    const csvData: (string | number)[][] = [
      ["Metric", "Value", "Growth %"],
      [
        "Total Revenue",
        `₹${analyticsData.totalRevenue.toLocaleString()}`,
        `${analyticsData.revenueGrowth.toFixed(1)}%`,
      ],
      [
        "Total Customers",
        analyticsData.totalCustomers,
        `${analyticsData.customerGrowth.toFixed(1)}%`,
      ],
      [
        "Total Bookings",
        analyticsData.totalBookings,
        `${analyticsData.bookingGrowth.toFixed(1)}%`,
      ],
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
      ...analyticsData.topServices.map((s) => [s.name, s.bookings, `₹${s.revenue.toLocaleString()}`]),
      [],
      ["Staff Performance", "Bookings", "Revenue"],
      ...analyticsData.staffPerformance.map((s) => [s.name, s.bookings, `₹${s.revenue.toLocaleString()}`]),
    ]

    // Convert rows to CSV string with escaping
    const csv = csvData.map((row) => row.map(escapeCSVValue).join(",")).join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="analytics-report-${dateRange}days.csv"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Failed to export analytics data" }, { status: 500 })
  }
}
