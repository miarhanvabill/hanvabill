import { NextResponse } from "next/server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { parseReportDates } from "@/lib/report-dates"

export async function GET(request: Request) {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const { searchParams } = new URL(request.url)
      const dateRange = searchParams.get("dateRange") || "This Year"
      const startDateParam = searchParams.get("startDate")
      const endDateParam = searchParams.get("endDate")

      const { startIso, endIso, days } = parseReportDates(dateRange, startDateParam, endDateParam)

      // Calculate previous period dates for growth calculation
      const prevEndDateObj = new Date(startIso)
      prevEndDateObj.setDate(prevEndDateObj.getDate() - 1)
      const prevStartDateObj = new Date(prevEndDateObj)
      prevStartDateObj.setDate(prevStartDateObj.getDate() - days + 1)
      const pad = (n: number) => String(n).padStart(2, "0")
      const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      const prevStartIso = fmt(prevStartDateObj)
      const prevEndIso = fmt(prevEndDateObj)

      // 1. Current Period Invoices Stats
      const invoiceStats = await sql`
        SELECT 
          COUNT(*)::int as total_invoices,
          COUNT(CASE WHEN status IN ('paid', 'completed') THEN 1 END)::int as paid_invoices,
          COALESCE(SUM(CASE WHEN status IN ('paid', 'completed') THEN amount ELSE 0 END), 0)::numeric as paid_revenue,
          COALESCE(SUM(amount), 0)::numeric as total_invoice_amount,
          COUNT(CASE WHEN status IN ('pending', 'sent', 'overdue', 'draft') THEN 1 END)::int as pending_invoices,
          COALESCE(SUM(CASE WHEN status IN ('pending', 'sent', 'overdue', 'draft') THEN amount ELSE 0 END), 0)::numeric as pending_amount
        FROM invoices
        WHERE tenant_id = ${tenantId}
          AND DATE(COALESCE(invoice_date, created_at)) >= ${startIso}
          AND DATE(COALESCE(invoice_date, created_at)) <= ${endIso}
      `.catch(() => [{}])

      // Previous Period Invoices Stats
      const prevInvoiceStats = await sql`
        SELECT 
          COUNT(*)::int as total_invoices,
          COUNT(CASE WHEN status IN ('paid', 'completed') THEN 1 END)::int as paid_invoices,
          COALESCE(SUM(CASE WHEN status IN ('paid', 'completed') THEN amount ELSE 0 END), 0)::numeric as paid_revenue,
          COALESCE(SUM(CASE WHEN status IN ('pending', 'sent', 'overdue', 'draft') THEN amount ELSE 0 END), 0)::numeric as pending_amount
        FROM invoices
        WHERE tenant_id = ${tenantId}
          AND DATE(COALESCE(invoice_date, created_at)) >= ${prevStartIso}
          AND DATE(COALESCE(invoice_date, created_at)) <= ${prevEndIso}
      `.catch(() => [{}])

      // Bookings Stats as companion/fallback
      const bookingStats = await sql`
        SELECT 
          COUNT(*)::int as total_bookings,
          COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed_bookings,
          COALESCE(SUM(CASE WHEN status IN ('completed', 'confirmed') THEN total_amount ELSE 0 END), 0)::numeric as booking_revenue,
          COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending_bookings,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END), 0)::numeric as pending_booking_amount
        FROM bookings
        WHERE tenant_id = ${tenantId}
          AND DATE(booking_date) >= ${startIso}
          AND DATE(booking_date) <= ${endIso}
      `.catch(() => [{}])

      const prevBookingStats = await sql`
        SELECT 
          COUNT(*)::int as total_bookings,
          COALESCE(SUM(CASE WHEN status IN ('completed', 'confirmed') THEN total_amount ELSE 0 END), 0)::numeric as booking_revenue
        FROM bookings
        WHERE tenant_id = ${tenantId}
          AND DATE(booking_date) >= ${prevStartIso}
          AND DATE(booking_date) <= ${prevEndIso}
      `.catch(() => [{}])

      const invStat = invoiceStats[0] || {}
      const prevInvStat = prevInvoiceStats[0] || {}
      const bookStat = bookingStats[0] || {}
      const prevBookStat = prevBookingStats[0] || {}

      const hasInvoices = Number(invStat.total_invoices || 0) > 0
      const totalRevenue = hasInvoices
        ? Math.max(Number(invStat.paid_revenue || 0), Number(bookStat.booking_revenue || 0))
        : Number(bookStat.booking_revenue || 0)
      const prevRevenue = hasInvoices
        ? Math.max(Number(prevInvStat.paid_revenue || 0), Number(prevBookStat.booking_revenue || 0))
        : Number(prevBookStat.booking_revenue || 0)

      const totalInvoices = hasInvoices ? Number(invStat.total_invoices || 0) : Number(bookStat.total_bookings || 0)
      const prevTotalInvoices = hasInvoices ? Number(prevInvStat.total_invoices || 0) : Number(prevBookStat.total_bookings || 0)

      const totalPayments = hasInvoices ? Number(invStat.paid_invoices || 0) : Number(bookStat.completed_bookings || 0)
      const prevTotalPayments = hasInvoices ? Number(prevInvStat.paid_invoices || 0) : Number(prevBookStat.total_bookings || 0)

      const totalOutstanding = hasInvoices && Number(invStat.pending_amount || 0) > 0
        ? Number(invStat.pending_amount || 0)
        : Number(bookStat.pending_booking_amount || 0)
      const prevOutstanding = hasInvoices && Number(prevInvStat.pending_amount || 0) > 0
        ? Number(prevInvStat.pending_amount || 0)
        : 0

      const calcGrowth = (curr: number, prev: number) => {
        if (prev <= 0) return curr > 0 ? 100 : 0
        return Number((((curr - prev) / prev) * 100).toFixed(1))
      }

      // 2. Revenue Breakdown over Time
      const useDaily = days <= 14
      let revenueTrendRows: any[] = []

      if (hasInvoices) {
        if (useDaily) {
          revenueTrendRows = await sql`
            SELECT 
              TO_CHAR(COALESCE(invoice_date, created_at), 'DD Mon') as period_label,
              DATE(COALESCE(invoice_date, created_at)) as period_key,
              COALESCE(SUM(CASE WHEN status IN ('paid', 'completed') THEN amount ELSE 0 END), 0)::numeric as revenue,
              COUNT(*)::int as invoices,
              COUNT(CASE WHEN status IN ('paid', 'completed') THEN 1 END)::int as payments
            FROM invoices
            WHERE tenant_id = ${tenantId}
              AND DATE(COALESCE(invoice_date, created_at)) >= ${startIso}
              AND DATE(COALESCE(invoice_date, created_at)) <= ${endIso}
            GROUP BY period_label, period_key
            ORDER BY period_key ASC
          `.catch(() => [])
        } else {
          revenueTrendRows = await sql`
            SELECT 
              TO_CHAR(COALESCE(invoice_date, created_at), 'Mon') as period_label,
              TO_CHAR(COALESCE(invoice_date, created_at), 'YYYY-MM') as period_key,
              COALESCE(SUM(CASE WHEN status IN ('paid', 'completed') THEN amount ELSE 0 END), 0)::numeric as revenue,
              COUNT(*)::int as invoices,
              COUNT(CASE WHEN status IN ('paid', 'completed') THEN 1 END)::int as payments
            FROM invoices
            WHERE tenant_id = ${tenantId}
              AND DATE(COALESCE(invoice_date, created_at)) >= ${startIso}
              AND DATE(COALESCE(invoice_date, created_at)) <= ${endIso}
            GROUP BY period_label, period_key
            ORDER BY period_key ASC
          `.catch(() => [])
        }
      }

      if (revenueTrendRows.length === 0) {
        if (useDaily) {
          revenueTrendRows = await sql`
            SELECT 
              TO_CHAR(booking_date, 'DD Mon') as period_label,
              DATE(booking_date) as period_key,
              COALESCE(SUM(CASE WHEN status IN ('completed', 'confirmed') THEN total_amount ELSE 0 END), 0)::numeric as revenue,
              COUNT(*)::int as invoices,
              COUNT(CASE WHEN status IN ('completed', 'confirmed') THEN 1 END)::int as payments
            FROM bookings
            WHERE tenant_id = ${tenantId}
              AND DATE(booking_date) >= ${startIso}
              AND DATE(booking_date) <= ${endIso}
            GROUP BY period_label, period_key
            ORDER BY period_key ASC
          `.catch(() => [])
        } else {
          revenueTrendRows = await sql`
            SELECT 
              TO_CHAR(booking_date, 'Mon') as period_label,
              TO_CHAR(booking_date, 'YYYY-MM') as period_key,
              COALESCE(SUM(CASE WHEN status IN ('completed', 'confirmed') THEN total_amount ELSE 0 END), 0)::numeric as revenue,
              COUNT(*)::int as invoices,
              COUNT(CASE WHEN status IN ('completed', 'confirmed') THEN 1 END)::int as payments
            FROM bookings
            WHERE tenant_id = ${tenantId}
              AND DATE(booking_date) >= ${startIso}
              AND DATE(booking_date) <= ${endIso}
            GROUP BY period_label, period_key
            ORDER BY period_key ASC
          `.catch(() => [])
        }
      }

      const revenueData = revenueTrendRows.map((r: any) => ({
        month: r.period_label || "Period",
        revenue: Number(r.revenue || 0),
        invoices: Number(r.invoices || 0),
        payments: Number(r.payments || 0),
      }))

      // 3. Payment Methods Distribution
      let paymentRows: any[] = []
      if (hasInvoices) {
        paymentRows = await sql`
          SELECT 
            COALESCE(NULLIF(TRIM(payment_method), ''), 'cash') as method,
            COALESCE(SUM(amount), 0)::numeric as amount,
            COUNT(*)::int as count
          FROM invoices
          WHERE tenant_id = ${tenantId}
            AND DATE(COALESCE(invoice_date, created_at)) >= ${startIso}
            AND DATE(COALESCE(invoice_date, created_at)) <= ${endIso}
          GROUP BY method
          ORDER BY amount DESC
        `.catch(() => [])
      }

      if (paymentRows.length === 0) {
        paymentRows = await sql`
          SELECT 
            COALESCE(NULLIF(TRIM(payment_method), ''), 'cash') as method,
            COALESCE(SUM(total_amount), 0)::numeric as amount,
            COUNT(*)::int as count
          FROM bookings
          WHERE tenant_id = ${tenantId}
            AND DATE(booking_date) >= ${startIso}
            AND DATE(booking_date) <= ${endIso}
            AND status IN ('completed', 'confirmed')
          GROUP BY method
          ORDER BY amount DESC
        `.catch(() => [])
      }

      const totalPaymentAmount = paymentRows.reduce((sum, r) => sum + Number(r.amount || 0), 0)

      const normalizeMethodName = (m: string) => {
        const lower = (m || "").toLowerCase().trim()
        if (lower === "cash") return "Cash"
        if (lower === "card" || lower === "credit_card" || lower === "debit_card") return "Card"
        if (lower === "upi" || lower === "gpay" || lower === "phonepe" || lower === "paytm") return "UPI"
        if (lower.includes("transfer") || lower.includes("bank") || lower.includes("neft") || lower.includes("rtgs")) return "Bank Transfer"
        if (lower === "wallet") return "Wallet"
        if (lower.includes("gift")) return "Gift Card"
        return m ? m.charAt(0).toUpperCase() + m.slice(1) : "Cash"
      }

      const paymentMethodData = paymentRows.map((r: any) => {
        const amt = Number(r.amount || 0)
        return {
          method: normalizeMethodName(r.method),
          amount: amt,
          count: Number(r.count || 0),
          percentage: totalPaymentAmount > 0 ? Number(((amt / totalPaymentAmount) * 100).toFixed(1)) : 0,
        }
      })

      // 4. Customer Segments Analysis
      const customerSpendingRows = await sql`
        WITH customer_spend AS (
          SELECT 
            c.id,
            COALESCE(SUM(b.total_amount), 0) as total_spent,
            COUNT(b.id) as visit_count
          FROM customers c
          LEFT JOIN bookings b ON c.id = b.customer_id 
            AND b.tenant_id = ${tenantId}
            AND b.status IN ('completed', 'confirmed')
            AND DATE(b.booking_date) >= ${startIso}
            AND DATE(b.booking_date) <= ${endIso}
          WHERE c.tenant_id = ${tenantId}
          GROUP BY c.id
        )
        SELECT 
          CASE 
            WHEN total_spent >= 10000 THEN 'VIP Customers'
            WHEN total_spent >= 3000 THEN 'Regular Customers'
            WHEN total_spent >= 1000 THEN 'Occasional Customers'
            ELSE 'New Customers'
          END as segment,
          COALESCE(SUM(total_spent), 0)::numeric as revenue,
          COUNT(*)::int as customers
        FROM customer_spend
        GROUP BY segment
        ORDER BY revenue DESC
      `.catch(() => [])

      const segmentOrder = ["VIP Customers", "Regular Customers", "Occasional Customers", "New Customers"]
      const customerSegmentData = segmentOrder.map((segName) => {
        const found = customerSpendingRows.find((r: any) => r.segment === segName)
        const rev = Number(found?.revenue || 0)
        const custCount = Number(found?.customers || 0)
        return {
          segment: segName,
          revenue: rev,
          customers: custCount,
          avgSpending: custCount > 0 ? Math.round(rev / custCount) : 0,
        }
      })

      // 5. Outstanding Aging Analysis
      let overdueRows: any[] = []
      if (hasInvoices) {
        overdueRows = await sql`
          SELECT 
            GREATEST(0, (CURRENT_DATE - DATE(COALESCE(due_date, invoice_date, created_at))))::int as days_overdue,
            amount::numeric
          FROM invoices
          WHERE tenant_id = ${tenantId}
            AND status IN ('pending', 'sent', 'overdue', 'draft')
        `.catch(() => [])
      }

      if (overdueRows.length === 0) {
        overdueRows = await sql`
          SELECT 
            GREATEST(0, (CURRENT_DATE - DATE(COALESCE(booking_date, created_at))))::int as days_overdue,
            total_amount::numeric as amount
          FROM bookings
          WHERE tenant_id = ${tenantId}
            AND status = 'pending'
        `.catch(() => [])
      }

      const ageBuckets = [
        { ageGroup: "0-30 days", min: 0, max: 30 },
        { ageGroup: "31-60 days", min: 31, max: 60 },
        { ageGroup: "61-90 days", min: 61, max: 90 },
        { ageGroup: "90+ days", min: 91, max: 999999 },
      ]

      const outstandingData = ageBuckets.map((bucket) => {
        const matching = overdueRows.filter((r: any) => {
          const d = Number(r.days_overdue || 0)
          return d >= bucket.min && d <= bucket.max
        })
        const amt = matching.reduce((sum, r) => sum + Number(r.amount || 0), 0)
        return {
          ageGroup: bucket.ageGroup,
          amount: amt,
          count: matching.length,
        }
      })

      const responseData = {
        summary: {
          totalRevenue,
          totalInvoices,
          totalPayments,
          totalOutstanding,
          revenueGrowth: calcGrowth(totalRevenue, prevRevenue),
          invoiceGrowth: calcGrowth(totalInvoices, prevTotalInvoices),
          paymentGrowth: calcGrowth(totalPayments, prevTotalPayments),
          outstandingGrowth: calcGrowth(totalOutstanding, prevOutstanding),
        },
        revenueData,
        paymentMethodData,
        customerSegmentData,
        outstandingData,
      }

      const response = NextResponse.json(responseData)
      response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
      response.headers.set("Pragma", "no-cache")
      response.headers.set("Expires", "0")
      return response
    } catch (error: any) {
      console.error("Advanced Billing Reports API error:", error)
      return NextResponse.json(
        { error: error?.message || "Internal server error" },
        { status: 500 }
      )
    }
  })
}
