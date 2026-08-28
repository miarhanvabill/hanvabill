import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subDays, format } from "date-fns"

export async function GET(request: Request) {
  return withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const range = searchParams.get("range") || "This Month"

      let startDate = new Date()
      const endDate = new Date()

      switch (range) {
        case "Today":
          startDate = startOfDay(new Date())
          break
        case "Yesterday":
          startDate = startOfDay(subDays(new Date(), 1))
          endDate.setTime(startDate.getTime() + 24 * 60 * 60 * 1000 - 1)
          break
        case "Last 7 Days":
          startDate = subDays(new Date(), 7)
          break
        case "This Week":
          startDate = startOfWeek(new Date(), { weekStartsOn: 1 })
          break
        case "This Month":
          startDate = startOfMonth(new Date())
          break
        case "Last 30 Days":
          startDate = subDays(new Date(), 30)
          break
        case "This Year":
          startDate = startOfYear(new Date())
          break
        default:
          startDate = startOfMonth(new Date())
      }

      const formattedStart = format(startDate, "yyyy-MM-dd HH:mm:ss")
      const formattedEnd = format(endDate, "yyyy-MM-dd HH:mm:ss")

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

      const staffCommissions = data.map(staff => {
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
