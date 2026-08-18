import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: Request) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const dateRange = searchParams.get("dateRange") || "This Month"
      const status = searchParams.get("status") || "all"

      // Calculate date range
      const startDate = new Date()
      switch (dateRange) {
        case "Today":
          startDate.setHours(0, 0, 0, 0)
          break
        case "This Week":
          startDate.setDate(startDate.getDate() - startDate.getDay())
          break
        case "This Month":
          startDate.setDate(1)
          break
        case "Last 3 Months":
          startDate.setMonth(startDate.getMonth() - 3)
          break
      }
      const startIso = startDate.toISOString().split("T")[0]

      // Build status filter
      const statusFilter = status === "all" ? "" : `AND e.status = '${status}'`

      const enquiries = await sql`
        SELECT 
          e.*,
          COALESCE(e.source, 'Unknown') as source,
          COALESCE(e.assigned_to, 'Unassigned') as assigned_to,
          b.total_amount as conversion_value
        FROM enquiries e
        LEFT JOIN bookings b ON e.customer_name = (
          SELECT c.full_name FROM customers c WHERE c.id = b.customer_id AND c.tenant_id = ${tenantId}
        ) AND b.booking_date >= e.inquiry_date::date
        WHERE e.inquiry_date >= ${startIso}
        AND e.tenant_id = ${tenantId}
        ${statusFilter ? sql.unsafe(statusFilter) : sql``}
        ORDER BY e.inquiry_date DESC
      `

      // Calculate stats
      const totalEnquiries = enquiries.length
      const newEnquiries = enquiries.filter((e) => e.status === "new").length
      const contacted = enquiries.filter((e) => e.status === "contacted").length
      const converted = enquiries.filter((e) => e.status === "converted").length
      const closed = enquiries.filter((e) => e.status === "closed").length
      const conversionRate = totalEnquiries > 0 ? (converted / totalEnquiries) * 100 : 0
      const totalConversionValue = enquiries
        .filter((e) => e.conversion_value)
        .reduce((sum, e) => sum + Number(e.conversion_value), 0)

      const stats = {
        total_enquiries: totalEnquiries,
        new_enquiries: newEnquiries,
        contacted: contacted,
        converted: converted,
        closed: closed,
        conversion_rate: Number(conversionRate.toFixed(1)),
        total_conversion_value: totalConversionValue,
        average_response_time: 2.5, // Mock average response time in hours
      }

      const formattedEnquiries = enquiries.map((enquiry) => ({
        ...enquiry,
        conversion_value: enquiry.conversion_value ? Number(enquiry.conversion_value) : null,
      }))

      return NextResponse.json({
        enquiries: formattedEnquiries,
        stats: stats,
      })
    } catch (error) {
      console.error("Error fetching enquiry report:", error)
      return NextResponse.json({ error: "Failed to fetch enquiry report" }, { status: 500 })
    }
  })
}
