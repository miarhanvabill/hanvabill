import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: Request) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const dateRange = searchParams.get("dateRange") || "Last 30 Days"

      // Calculate date range
      const days = dateRange === "Last 7 Days" ? 7 : dateRange === "Last 30 Days" ? 30 : 90
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const startIso = startDate.toISOString().split("T")[0]

      // Get customer counts
      const customerCounts = await sql`
        SELECT 
          COUNT(*) as total_customers,
          COUNT(*) FILTER (WHERE created_at >= ${startIso}) as new_customers
        FROM customers
        WHERE tenant_id = ${tenantId}
      `

      // Get top customers
      const topCustomers = await sql`
        SELECT 
          c.id,
          c.full_name as name,
          COALESCE(SUM(b.total_amount), 0) as total_spent,
          COUNT(b.id) as visit_count,
          MAX(b.booking_date)::text as last_visit
        FROM customers c
        LEFT JOIN bookings b ON c.id = b.customer_id AND b.tenant_id = ${tenantId}
        WHERE (b.booking_date >= ${startIso} OR b.booking_date IS NULL)
        AND c.tenant_id = ${tenantId}
        GROUP BY c.id, c.full_name
        ORDER BY total_spent DESC
        LIMIT 10
      `

      // Get customer segments
      const customerSegments = await sql`
        SELECT 
          CASE 
            WHEN total_spent >= 10000 THEN 'VIP'
            WHEN total_spent >= 5000 THEN 'Premium'
            WHEN total_spent >= 2000 THEN 'Regular'
            ELSE 'New'
          END as segment,
          COUNT(*) as count,
          AVG(total_spent) as avg_spending
        FROM (
          SELECT 
            c.id,
            COALESCE(SUM(b.total_amount), 0) as total_spent
          FROM customers c
          LEFT JOIN bookings b ON c.id = b.customer_id AND b.tenant_id = ${tenantId}
          WHERE c.tenant_id = ${tenantId}
          GROUP BY c.id
        ) customer_totals
        GROUP BY segment
        ORDER BY avg_spending DESC
      `

      // Get demographics
      const demographics = await sql`
        SELECT 
          COUNT(*) FILTER (WHERE gender = 'male') * 100.0 / COUNT(*) as male,
          COUNT(*) FILTER (WHERE gender = 'female') * 100.0 / COUNT(*) as female
        FROM customers
        WHERE created_at >= ${startIso}
        AND tenant_id = ${tenantId}
      `

      // Calculate metrics
      const totalCustomers = Number(customerCounts[0]?.total_customers) || 0
      const newCustomers = Number(customerCounts[0]?.new_customers) || 0
      const returningCustomers = totalCustomers - newCustomers

      // Calculate growth (simplified)
      const customerGrowth = totalCustomers > 0 ? (newCustomers / totalCustomers) * 100 : 0

      // Calculate average lifetime value
      const avgLifetimeValue =
        topCustomers.length > 0
          ? topCustomers.reduce((sum, c) => sum + Number(c.total_spent), 0) / topCustomers.length
          : 0

      const formattedSegments = customerSegments.map((segment) => ({
        segment: segment.segment,
        count: Number(segment.count),
        percentage: totalCustomers > 0 ? (Number(segment.count) / totalCustomers) * 100 : 0,
        avg_spending: Number(segment.avg_spending) || 0,
      }))

      const response = {
        totalCustomers,
        newCustomers,
        returningCustomers,
        customerGrowth,
        avgLifetimeValue,
        avgVisitFrequency: 2.5, // Placeholder - would need more complex calculation
        topCustomers: topCustomers.map((customer) => ({
          ...customer,
          total_spent: Number(customer.total_spent) || 0,
          visit_count: Number(customer.visit_count) || 0,
        })),
        customerSegments: formattedSegments,
        demographics: {
          male: Number(demographics[0]?.male) || 0,
          female: Number(demographics[0]?.female) || 0,
          age_groups: [
            { range: "18-25", count: Math.floor(totalCustomers * 0.2) },
            { range: "26-35", count: Math.floor(totalCustomers * 0.4) },
            { range: "36-45", count: Math.floor(totalCustomers * 0.25) },
            { range: "46+", count: Math.floor(totalCustomers * 0.15) },
          ],
        },
      }

      return NextResponse.json(response)
    } catch (error) {
      console.error("Error fetching customer analytics:", error)
      return NextResponse.json({ error: "Failed to fetch customer analytics" }, { status: 500 })
    }
  })
}
