import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { parseReportDates } from "@/lib/report-dates"

export async function GET(request: Request) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const dateRange = searchParams.get("dateRange") || "This Month"
      const status = searchParams.get("status") || "all"
      const startDateParam = searchParams.get("startDate")
      const endDateParam = searchParams.get("endDate")

      const { startIso, endIso } = parseReportDates(dateRange, startDateParam, endDateParam)

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
        AND e.inquiry_date <= ${endIso}
        AND e.tenant_id = ${tenantId}
        ${status !== "all" ? sql`AND e.status = ${status}` : sql``}
        ORDER BY e.inquiry_date DESC
      `

      // Calculate stats
      const totalEnquiries = enquiries.length
      const newEnquiries = enquiries.filter((e: any) => e.status === "new").length
      const contacted = enquiries.filter((e: any) => e.status === "contacted").length
      const converted = enquiries.filter((e: any) => e.status === "converted").length
      const closed = enquiries.filter((e: any) => e.status === "closed").length
      const conversionRate = totalEnquiries > 0 ? (converted / totalEnquiries) * 100 : 0
      const totalConversionValue = enquiries
        .filter((e: any) => e.conversion_value)
        .reduce((sum: number, e: any) => sum + (Number(e.conversion_value) || 0), 0)

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

      const formattedEnquiries = enquiries.map((enquiry: any) => ({
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
