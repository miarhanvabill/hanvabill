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
          COUNT(*) FILTER (WHERE LOWER(gender) = 'male') * 100.0 / NULLIF(COUNT(*), 0) as male,
          COUNT(*) FILTER (WHERE LOWER(gender) = 'female') * 100.0 / NULLIF(COUNT(*), 0) as female,
          COUNT(*) FILTER (WHERE date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth::DATE)) BETWEEN 18 AND 25) as age_18_25,
          COUNT(*) FILTER (WHERE date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth::DATE)) BETWEEN 26 AND 35) as age_26_35,
          COUNT(*) FILTER (WHERE date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth::DATE)) BETWEEN 36 AND 45) as age_36_45,
          COUNT(*) FILTER (WHERE date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth::DATE)) >= 46) as age_46_plus,
          COUNT(*) FILTER (WHERE date_of_birth IS NULL OR EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth::DATE)) < 18) as age_unknown
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
        avgVisitFrequency: totalCustomers > 0 ? (Number(topCustomers.reduce((sum, c) => sum + Number(c.visit_count), 0)) / topCustomers.length) || 1.0 : 0,
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
            { range: "18-25", count: Number(demographics[0]?.age_18_25) || 0 },
            { range: "26-35", count: Number(demographics[0]?.age_26_35) || 0 },
            { range: "36-45", count: Number(demographics[0]?.age_36_45) || 0 },
            { range: "46+", count: Number(demographics[0]?.age_46_plus) || 0 },
            { range: "Unknown", count: Number(demographics[0]?.age_unknown) || 0 },
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
