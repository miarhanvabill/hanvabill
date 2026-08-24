"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"

export interface AnalyticsData {
  totalRevenue: number
  revenueGrowth: number
  totalCustomers: number
  customerGrowth: number
  totalBookings: number
  bookingGrowth: number
  avgServiceTime: number
  serviceTimeImprovement: number
  avgTransactionValue: number
  repeatCustomerRate: number
  monthlyRecurringRevenue: number
  revenueByCategory: Array<{
    name: string
    revenue: number
    percentage: number
  }>
  customerAcquisition: Array<{
    source: string
    customers: number
    percentage: number
  }>
  customerDemographics: {
    male: number
    female: number
    others: number
  }
  demographicSpending: {
    male: number
    female: number
    others: number
  }
  topServices: Array<{
    name: string
    bookings: number
    revenue: number
    avgPrice: number
    growth: number
  }>
  staffPerformance: Array<{
    name: string
    bookings: number
    revenue: number
    rating: number
    ratingCount: number
  }>
  staffUtilization: Array<{
    name: string
    utilization: number
  }>
  revenueTrend: Array<{
    date: string
    revenue: number
  }>
}

export async function getBusinessAnalytics(dateRange: string): Promise<AnalyticsData> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    // Validate input
    if (typeof dateRange !== "string" && typeof dateRange !== "number") {
      throw new Error("dateRange should be a string or number")
    }

    const days = Number.parseInt(dateRange.toString(), 10)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)
    const startIso = startDate.toISOString().split("T")[0]
    const prevStart = new Date(startDate)
    prevStart.setDate(prevStart.getDate() - days)
    const prevIso = prevStart.toISOString().split("T")[0]
    const endIso = endDate.toISOString().split("T")[0]

    const fallbackData: AnalyticsData = {
      totalRevenue: 0,
      revenueGrowth: 0,
      totalCustomers: 0,
      customerGrowth: 0,
      totalBookings: 0,
      bookingGrowth: 0,
      avgServiceTime: 0,
      serviceTimeImprovement: 0,
      avgTransactionValue: 0,
      repeatCustomerRate: 0,
      monthlyRecurringRevenue: 0,
      revenueByCategory: [],
      customerAcquisition: [],
      customerDemographics: { male: 0, female: 0, others: 0 },
      demographicSpending: { male: 0, female: 0, others: 0 },
      topServices: [],
      staffPerformance: [],
      staffUtilization: [],
      revenueTrend: [],
    }

    try {
      // 1. Revenue totals & growth
      const currRevResult = await sql`
        SELECT COALESCE(SUM(total_amount),0) AS total
        FROM bookings
        WHERE tenant_id = ${tenantId}
          AND booking_date BETWEEN ${startIso} AND ${endIso}
          AND status='completed'
      `
      const currRev = currRevResult[0] || { total: 0 }

      const prevRevResult = await sql`
        SELECT COALESCE(SUM(total_amount),0) AS total
        FROM bookings
        WHERE tenant_id = ${tenantId}
          AND booking_date BETWEEN ${prevIso} AND ${startIso}
          AND status='completed'
      `
      const prevRev = prevRevResult[0] || { total: 0 }

      const totalRevenue = Number.parseFloat(currRev.total)
      const revenueGrowth =
        Number.parseFloat(prevRev.total) > 0
          ? ((totalRevenue - Number.parseFloat(prevRev.total)) / Number.parseFloat(prevRev.total)) * 100
          : 0

      // 2. Customer counts & growth
      const currCustResult = await sql`
        SELECT COUNT(*) AS count
        FROM customers
        WHERE tenant_id = ${tenantId}
          AND created_at BETWEEN ${startIso} AND ${endDate.toISOString()}
      `
      const currCust = currCustResult[0] || { count: 0 }

      const prevCustResult = await sql`
        SELECT COUNT(*) AS count
        FROM customers
        WHERE tenant_id = ${tenantId}
          AND created_at BETWEEN ${prevIso} AND ${startIso}
      `
      const prevCust = prevCustResult[0] || { count: 0 }

      const totalCustomers = Number.parseInt(currCust.count)
      const customerGrowth =
        Number.parseInt(prevCust.count) > 0
          ? ((totalCustomers - Number.parseInt(prevCust.count)) / Number.parseInt(prevCust.count)) * 100
          : 0

      // 3. Bookings counts & growth
      const currBookResult = await sql`
        SELECT COUNT(*) AS count
        FROM bookings
        WHERE tenant_id = ${tenantId}
          AND booking_date BETWEEN ${startIso} AND ${endDate.toISOString()}
          AND status='completed'
      `
      const currBook = currBookResult[0] || { count: 0 }

      const prevBookResult = await sql`
        SELECT COUNT(*) AS count
        FROM bookings
        WHERE tenant_id = ${tenantId}
          AND booking_date BETWEEN ${prevIso} AND ${startIso}
          AND status='completed'
      `
      const prevBook = prevBookResult[0] || { count: 0 }

      const totalBookings = Number.parseInt(currBook.count)
      const bookingGrowth =
        Number.parseInt(prevBook.count) > 0
          ? ((totalBookings - Number.parseInt(prevBook.count)) / Number.parseInt(prevBook.count)) * 100
          : 0

      // 4. Service time - using average service duration from services table
      const currTimeResult = await sql`
        SELECT AVG(s.duration_minutes) AS avg_minutes
        FROM bookings b
        JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
        JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
        WHERE b.tenant_id = ${tenantId}
          AND b.booking_date >= ${startIso}
          AND b.status='completed'
      `
      const currTime = currTimeResult[0] || { avg_minutes: 0 }

      const prevTimeResult = await sql`
        SELECT AVG(s.duration_minutes) AS avg_minutes
        FROM bookings b
        JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
        JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
        WHERE b.tenant_id = ${tenantId}
          AND b.booking_date BETWEEN ${prevIso} AND ${startIso}
          AND b.status='completed'
      `
      const prevTime = prevTimeResult[0] || { avg_minutes: 0 }

      const avgServiceTime = Number.parseFloat(currTime.avg_minutes) || 0
      const serviceTimeImprovement =
        Number.parseFloat(prevTime.avg_minutes) > 0
          ? ((Number.parseFloat(prevTime.avg_minutes) - avgServiceTime) / Number.parseFloat(prevTime.avg_minutes)) * 100
          : 0

      // 5. Transaction value & repeat rate
      const avgTxResult = await sql`
        SELECT AVG(total_amount) AS avg_value
        FROM bookings
        WHERE tenant_id = ${tenantId}
          AND booking_date >= ${startIso}
          AND status='completed'
      `
      const avgTx = avgTxResult[0] || { avg_value: 0 }
      const avgTransactionValue = Number.parseFloat(avgTx.avg_value) || 0

      const repeatCustResult = await sql`
        SELECT COUNT(DISTINCT customer_id) FILTER (
          WHERE customer_id IN (
            SELECT customer_id FROM bookings WHERE tenant_id = ${tenantId} AND booking_date < ${startIso}
          )
        ) AS repeat_count
        FROM bookings
        WHERE tenant_id = ${tenantId}
          AND booking_date >= ${startIso}
      `
      const repeatCust = repeatCustResult[0] || { repeat_count: 0 }
      const repeatCustomerRate =
        totalCustomers > 0 ? (Number.parseInt(repeatCust.repeat_count) / totalCustomers) * 100 : 0

      // 6. MRR - using monthly recurring bookings as proxy
      const mrrResult = await sql`
        SELECT COALESCE(AVG(total_amount),0) AS mrr
        FROM bookings
        WHERE tenant_id = ${tenantId}
          AND booking_date >= ${startIso}
          AND status='completed'
      `
      const mrr = mrrResult[0] || { mrr: 0 }
      const monthlyRecurringRevenue = Number.parseFloat(mrr.mrr) * 30 || 0

      // 7. Revenue by category - using service categories
      const revByCatResult = await sql`
        SELECT s.category AS name,
               COALESCE(SUM(bs.price * bs.quantity),0) AS revenue
        FROM bookings b
        JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
        JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
        WHERE b.tenant_id = ${tenantId}
          AND b.booking_date >= ${startIso}
          AND b.status='completed'
        GROUP BY s.category
      `
      const revByCat = Array.isArray(revByCatResult) ? revByCatResult : []
      const sumAll = revByCat.reduce((sum, r) => sum + Number.parseFloat(r.revenue), 0)
      const revenueByCategory = revByCat.map((r) => ({
        name: r.name || "Uncategorized",
        revenue: Number.parseFloat(r.revenue),
        percentage: sumAll > 0 ? (Number.parseFloat(r.revenue) / sumAll) * 100 : 0,
      }))

      // 8. Customer acquisition & demographics
      const custBySourceResult = await sql`
        SELECT lead_source AS source,
               COUNT(*) AS count
        FROM customers
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${startIso}
          AND lead_source IS NOT NULL
        GROUP BY lead_source
      `
      const custBySource = Array.isArray(custBySourceResult) ? custBySourceResult : []
      const customerAcquisition = custBySource.map((r) => ({
        source: r.source || "Unknown",
        customers: Number.parseInt(r.count),
        percentage: totalCustomers > 0 ? (Number.parseInt(r.count) / totalCustomers) * 100 : 0,
      }))

      const demoResult = await sql`
        SELECT
          COUNT(DISTINCT b.customer_id) FILTER (WHERE c.gender='male') AS male,
          COUNT(DISTINCT b.customer_id) FILTER (WHERE c.gender='female') AS female,
          -- For others, include walk-ins (where customer_id is null) or gender is not male/female
          COUNT(DISTINCT b.id) FILTER (WHERE b.customer_id IS NULL) + COUNT(DISTINCT b.customer_id) FILTER (WHERE c.gender NOT IN ('male','female') OR c.gender IS NULL) AS others
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
        WHERE b.tenant_id = ${tenantId}
          AND b.booking_date >= ${startIso}
          AND b.status = 'completed'
      `
      const demo = demoResult[0] || { male: 0, female: 0, others: 0 }
      const customerDemographics = {
        male: Number.parseInt(demo.male),
        female: Number.parseInt(demo.female),
        others: Number.parseInt(demo.others),
      }

      const spendingResult = await sql`
        SELECT
          COALESCE(SUM(b.total_amount) FILTER (WHERE c.gender='male'), 0) AS male_spending,
          COALESCE(SUM(b.total_amount) FILTER (WHERE c.gender='female'), 0) AS female_spending,
          COALESCE(SUM(b.total_amount) FILTER (WHERE c.gender NOT IN ('male','female') OR c.gender IS NULL), 0) AS others_spending
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
        WHERE b.tenant_id = ${tenantId}
          AND b.booking_date >= ${startIso}
          AND b.status = 'completed'
      `
      const spending = spendingResult[0] || { male_spending: 0, female_spending: 0, others_spending: 0 }
      const demographicSpending = {
        male: Number.parseFloat(spending.male_spending),
        female: Number.parseFloat(spending.female_spending),
        others: Number.parseFloat(spending.others_spending),
      }

      // 9. Top services & staff performance
      const srvResult = await sql`
        SELECT s.name,
               COUNT(bs.id) AS booking_count,
               COALESCE(SUM(bs.price * bs.quantity),0) AS revenue
        FROM services s
        LEFT JOIN booking_services bs ON s.id = bs.service_id AND bs.tenant_id = ${tenantId}
        LEFT JOIN bookings b ON bs.booking_id = b.id AND b.tenant_id = ${tenantId}
        WHERE b.booking_date >= ${startIso}
          AND b.status='completed'
        GROUP BY s.id, s.name
        ORDER BY revenue DESC
        LIMIT 5
      `
      const srvRes = Array.isArray(srvResult) ? srvResult : []
      const topServices = srvRes.map((s) => ({
        name: s.name,
        bookings: Number.parseInt(s.booking_count),
        revenue: Number.parseFloat(s.revenue),
        avgPrice:
          Number.parseInt(s.booking_count) > 0 ? Number.parseFloat(s.revenue) / Number.parseInt(s.booking_count) : 0,
        growth: 0, // Add prior-window growth logic similarly if desired
      }))

      const stfResult = await sql`
        SELECT st.name,
               COUNT(b.id) AS booking_count,
               COALESCE(SUM(b.total_amount),0) AS revenue,
               COALESCE(AVG(r.rating), 0) AS avg_rating,
               COUNT(r.id) AS rating_count
        FROM staff st
        LEFT JOIN bookings b ON st.id = b.staff_id AND b.tenant_id = ${tenantId}
        LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
        WHERE b.booking_date >= ${startIso}
          AND b.status='completed'
        GROUP BY st.id, st.name
        ORDER BY revenue DESC
      `
      const stfRes = Array.isArray(stfResult) ? stfResult : []
      const staffPerformance = stfRes.map((s) => ({
        name: s.name,
        bookings: Number.parseInt(s.booking_count),
        revenue: Number.parseFloat(s.revenue),
        rating: Number.parseFloat(s.avg_rating),
        ratingCount: Number.parseInt(s.rating_count) || 0,
      }))

      // 10. Staff utilization - using service duration as proxy for time worked
      const utilResult = await sql`
        SELECT st.name,
               ROUND(
                 (COALESCE(SUM(s.duration_minutes), 0)::numeric / 60.0 /
                  (${days} * 8)) * 100,
                 2
               ) AS utilization
        FROM staff st
        JOIN bookings b ON st.id = b.staff_id AND b.tenant_id = ${tenantId}
        JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
        JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
        WHERE b.booking_date >= ${startIso}
          AND b.status='completed'
        GROUP BY st.name
      `
      const utilRes = Array.isArray(utilResult) ? utilResult : []
      const staffUtilization = utilRes.map((u) => ({
        name: u.name,
        utilization: Number.parseFloat(u.utilization) || 0,
      }))

      // 12. Revenue Trend
      const trendResult = await sql`
        SELECT 
          TO_CHAR(booking_date::date, 'DD Mon') as date,
          booking_date::date as full_date,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM bookings
        WHERE tenant_id = ${tenantId}
          AND booking_date >= ${startIso}
          AND booking_date <= ${endIso}
          AND status='completed'
        GROUP BY booking_date::date, TO_CHAR(booking_date::date, 'DD Mon')
        ORDER BY full_date ASC
      `
      const trendRes = Array.isArray(trendResult) ? trendResult : []
      const revenueTrend = trendRes.map((t) => ({
        date: t.date,
        revenue: Number.parseFloat(t.revenue) || 0,
      }))

      return {
        totalRevenue,
        revenueGrowth,
        totalCustomers,
        customerGrowth,
        totalBookings,
        bookingGrowth,
        avgServiceTime,
        serviceTimeImprovement,
        avgTransactionValue,
        repeatCustomerRate,
        monthlyRecurringRevenue,
        revenueByCategory,
        customerAcquisition,
        customerDemographics,
        demographicSpending,
        topServices,
        staffPerformance,
        staffUtilization,
        revenueTrend,
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
      return fallbackData
    }
  })
}
