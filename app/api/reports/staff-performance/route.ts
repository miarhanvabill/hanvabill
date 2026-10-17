import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"

export async function GET(request: Request) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const dateRange = searchParams.get("dateRange") || "Last 30 Days"
      let startDate = searchParams.get("startDate")
      let endDate = searchParams.get("endDate")

      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, "0")
      const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

      if (!startDate || !endDate) {
        if (dateRange === "Today") {
          startDate = fmt(now); endDate = fmt(now);
        } else if (dateRange === "Yesterday") {
          const y = new Date(now); y.setDate(y.getDate() - 1);
          startDate = fmt(y); endDate = fmt(y);
        } else if (dateRange === "Last 7 Days" || dateRange === "This Week") {
          const s = new Date(now); s.setDate(s.getDate() - 6);
          startDate = fmt(s); endDate = fmt(now);
        } else if (dateRange === "Last 30 Days" || dateRange === "This Month") {
          const s = new Date(now); s.setDate(s.getDate() - 29);
          startDate = fmt(s); endDate = fmt(now);
        } else if (dateRange === "Last 90 Days" || dateRange === "Last 3 Months") {
          const s = new Date(now); s.setDate(s.getDate() - 89);
          startDate = fmt(s); endDate = fmt(now);
        } else if (dateRange === "Last 6 Months") {
          const s = new Date(now); s.setDate(s.getDate() - 179);
          startDate = fmt(s); endDate = fmt(now);
        } else if (dateRange === "Last 12 Months" || dateRange === "This Year") {
          const s = new Date(now); s.setDate(s.getDate() - 364);
          startDate = fmt(s); endDate = fmt(now);
        } else {
          const s = new Date(now); s.setDate(s.getDate() - 29);
          startDate = fmt(s); endDate = fmt(now);
        }
      }

      // Guarantee required tables exist
      await sql`
        CREATE TABLE IF NOT EXISTS staff_commission_splits (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL,
          invoice_id INTEGER NOT NULL,
          service_item_name TEXT NOT NULL,
          staff_id INTEGER NOT NULL,
          split_percentage NUMERIC(5,2) NOT NULL DEFAULT 50.00,
          revenue_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
      await sql`
        CREATE TABLE IF NOT EXISTS reviews (
          id SERIAL PRIMARY KEY,
          tenant_id VARCHAR(100) NOT NULL,
          customer_id INTEGER,
          booking_id INTEGER,
          rating INTEGER NOT NULL,
          review_text TEXT,
          platform VARCHAR(50) DEFAULT 'Direct',
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `
      await sql`
        CREATE TABLE IF NOT EXISTS attendance (
          id SERIAL PRIMARY KEY,
          tenant_id VARCHAR(100) NOT NULL,
          staff_id INTEGER NOT NULL,
          date DATE NOT NULL,
          status VARCHAR(50) NOT NULL,
          check_in_time TIME,
          check_out_time TIME,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `

      // CTE query: Isolated aggregations eliminate Cartesian product duplicates
      const staffPerformance = await sql`
        WITH direct_booking_totals AS (
          SELECT 
            b.staff_id,
            COUNT(DISTINCT b.id) as direct_bookings_count,
            COALESCE(SUM(b.total_amount), 0) as direct_revenue,
            COUNT(DISTINCT b.customer_id) as unique_customers
          FROM bookings b
          WHERE b.tenant_id = ${tenantId}
            AND b.booking_date >= ${startDate}
            AND b.booking_date <= ${endDate}
            AND (b.status IS NULL OR b.status != 'cancelled')
          GROUP BY b.staff_id
        ),
        direct_booking_services AS (
          SELECT 
            b.staff_id,
            COUNT(bs.id) as direct_services_count,
            AVG(COALESCE(srv.duration_minutes, 30)) as avg_service_duration
          FROM bookings b
          JOIN booking_services bs ON b.id = bs.booking_id AND (bs.tenant_id = ${tenantId} OR bs.tenant_id IS NULL)
          LEFT JOIN services srv ON bs.service_id = srv.id AND (srv.tenant_id = ${tenantId} OR srv.tenant_id IS NULL)
          WHERE b.tenant_id = ${tenantId}
            AND b.booking_date >= ${startDate}
            AND b.booking_date <= ${endDate}
            AND (b.status IS NULL OR b.status != 'cancelled')
          GROUP BY b.staff_id
        ),
        split_totals AS (
          SELECT 
            scs.staff_id,
            COALESCE(SUM(scs.revenue_amount), 0) as split_revenue,
            COUNT(scs.id) as split_services_count,
            COUNT(DISTINCT scs.invoice_id) as split_bookings_count
          FROM staff_commission_splits scs
          WHERE scs.tenant_id = ${tenantId}
            AND scs.created_at >= ${startDate}::date
            AND scs.created_at < ${endDate}::date + INTERVAL '1 day'
          GROUP BY scs.staff_id
        ),
        review_totals AS (
          SELECT 
            b.staff_id,
            COUNT(r.id) as review_count,
            ROUND(AVG(r.rating)::numeric, 1) as avg_rating
          FROM reviews r
          JOIN bookings b ON r.booking_id = b.id AND b.tenant_id = ${tenantId}
          WHERE r.tenant_id = ${tenantId}
            AND (r.status = 'approved' OR r.status = 'pending' OR r.status IS NULL)
          GROUP BY b.staff_id
        ),
        attendance_totals AS (
          SELECT 
            att.staff_id,
            COUNT(*) as total_logged_days,
            COUNT(*) FILTER (WHERE LOWER(att.status) IN ('present', 'half_day', 'late')) as attended_days
          FROM attendance att
          WHERE att.tenant_id = ${tenantId}
            AND att.date >= ${startDate}
            AND att.date <= ${endDate}
          GROUP BY att.staff_id
        )
        SELECT 
          s.id,
          s.name,
          COALESCE(s.role, 'Staff Member') as role,
          COALESCE(dbt.direct_bookings_count, 0) as direct_bookings_count,
          COALESCE(dbt.direct_revenue, 0) as direct_revenue,
          COALESCE(dbt.unique_customers, 0) as unique_customers,
          COALESCE(dbs.direct_services_count, 0) as direct_services_count,
          COALESCE(dbs.avg_service_duration, 30) as avg_service_duration,
          COALESCE(spt.split_revenue, 0) as split_revenue,
          COALESCE(spt.split_services_count, 0) as split_services_count,
          COALESCE(spt.split_bookings_count, 0) as split_bookings_count,
          rt.avg_rating,
          COALESCE(rt.review_count, 0) as review_count,
          att.total_logged_days,
          att.attended_days
        FROM staff s
        LEFT JOIN direct_booking_totals dbt ON s.id = dbt.staff_id
        LEFT JOIN direct_booking_services dbs ON s.id = dbs.staff_id
        LEFT JOIN split_totals spt ON s.id = spt.staff_id
        LEFT JOIN review_totals rt ON s.id = rt.staff_id
        LEFT JOIN attendance_totals att ON s.id = att.staff_id
        WHERE s.is_active = true
          AND s.tenant_id = ${tenantId}
        ORDER BY (COALESCE(dbt.direct_revenue, 0) + COALESCE(spt.split_revenue, 0)) DESC
      `

      const formattedData = staffPerformance.map((staff: any) => {
        const directBookings = Number(staff.direct_bookings_count) || 0
        const splitBookings = Number(staff.split_bookings_count) || 0
        const totalBookings = directBookings > 0 ? directBookings : splitBookings

        const directRevenue = Number(staff.direct_revenue) || 0
        const splitRevenue = Number(staff.split_revenue) || 0
        // Staff total revenue incorporates split revenue for secondary staff members
        const totalRevenue = directRevenue > 0 ? directRevenue : splitRevenue

        const directServices = Number(staff.direct_services_count) || 0
        const splitServices = Number(staff.split_services_count) || 0
        const servicesCompleted = directServices > 0 ? directServices : splitServices

        const reviewCount = Number(staff.review_count) || 0
        const avgRating = reviewCount > 0 ? Number(staff.avg_rating) : null

        const totalLoggedDays = Number(staff.total_logged_days) || 0
        const attendedDays = Number(staff.attended_days) || 0
        const attendanceRate = totalLoggedDays > 0 ? Math.round((attendedDays * 100) / totalLoggedDays) : null

        const avgServiceTime = Math.round(Number(staff.avg_service_duration) || (servicesCompleted > 0 ? 30 : 0))

        return {
          id: Number(staff.id),
          name: staff.name,
          role: staff.role,
          bookings_count: totalBookings,
          direct_bookings_count: directBookings,
          direct_revenue: directRevenue,
          split_revenue: splitRevenue,
          total_revenue: totalRevenue,
          avg_rating: avgRating,
          review_count: reviewCount,
          attendance_rate: attendanceRate,
          attendance_logs_count: totalLoggedDays,
          customer_satisfaction: avgRating !== null ? Math.round(avgRating * 20) : null,
          services_completed: servicesCompleted,
          avg_service_time: avgServiceTime,
          unique_customers: Number(staff.unique_customers) || 0,
        }
      })

      return NextResponse.json(formattedData)
    } catch (error) {
      console.error("Error fetching staff performance:", error)
      return NextResponse.json({ error: "Failed to fetch staff performance" }, { status: 500 })
    }
  })
}
