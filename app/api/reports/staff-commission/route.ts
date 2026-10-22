import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { parseReportDates } from "@/lib/report-dates"

export async function GET(request: Request) {
  return withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const range = searchParams.get("range") || searchParams.get("dateRange") || "This Month"
      const startDateParam = searchParams.get("startDate")
      const endDateParam = searchParams.get("endDate")

      const { startIso, endIso } = parseReportDates(range, startDateParam, endDateParam)
      const formattedStart = `${startIso} 00:00:00`
      const formattedEnd = `${endIso} 23:59:59`

      const data = await sql`
        SELECT 
          s.id,
          s.name,
          s.role,
          cp.commission_type,
          cp.base_rate,
          COUNT(DISTINCT i.id) as bookings_count,
          COALESCE(SUM(i.amount), 0) as total_revenue
        FROM staff s
        LEFT JOIN commission_profiles cp ON s.commission_profile_id = cp.id
        LEFT JOIN bookings b ON b.staff_id = s.id AND b.tenant_id = ${tenantId}
        LEFT JOIN invoices i ON i.booking_id = b.id 
          AND i.tenant_id = ${tenantId} 
          AND i.status = 'paid'
          AND i.created_at >= ${formattedStart} 
          AND i.created_at <= ${formattedEnd}
        WHERE s.tenant_id = ${tenantId} AND s.is_active = true
        GROUP BY s.id, s.name, s.role, cp.commission_type, cp.base_rate
      `

      let totalRevenue = 0
      let totalCommission = 0

      const staffCommissions = data.map((staff: any) => {
        const revenue = parseFloat(staff.total_revenue) || 0
        const baseRate = parseFloat(staff.base_rate) || 0
        let commission = 0

        if (staff.commission_type === 'percentage') {
          commission = (revenue * baseRate) / 100
        } else if (staff.commission_type === 'fixed') {
          // Fixed per booking
          commission = parseInt(staff.bookings_count) * baseRate
        }

        totalRevenue += revenue
        totalCommission += commission

        return {
          id: staff.id,
          name: staff.name,
          role: staff.role || 'Staff',
          bookings_count: parseInt(staff.bookings_count) || 0,
          total_revenue: revenue,
          commission_type: staff.commission_type || 'None',
          base_rate: baseRate,
          commission_earned: commission
        }
      })

      return NextResponse.json({
        staffCommissions,
        summary: {
          totalRevenue,
          totalCommission
        }
      })
    } catch (error) {
      console.error("Error generating commission report:", error)
      return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
    }
  })
}
