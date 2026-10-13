"use server"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { cacheFetch } from "@/lib/cache"
import type { Booking, BookingStats } from "./bookings"

function mapBookingResult(booking: any): Booking {
  const serviceName = booking.service_names || booking.service_name || ""
  const staffName = booking.staff_names || booking.staff_name || ""
  return {
    ...booking,
    id: Number(booking.id),
    customer_id: Number(booking.customer_id),
    staff_id: Number(booking.staff_id),
    service_name: serviceName,
    service_names: serviceName,
    staff_name: staffName,
    staff_names: staffName,
    customer_phone: booking.customer_phone || "",
    total_amount: Number(booking.total_amount),
    rating: booking.rating ? Number(booking.rating) : null,
  }
}

export interface BookingsPageData {
  bookings: Booking[]
  total: number
  stats: BookingStats
}

export async function getBookingsPageData(params?: {
  startDate?: string
  endDate?: string
  status?: string
  search?: string
  offset?: number
  limit?: number
}): Promise<BookingsPageData> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const startStr = typeof params?.startDate === "string" ? params.startDate : ""
      const endStr = typeof params?.endDate === "string" ? params.endDate : ""
      const searchStr = typeof params?.search === "string" ? params.search.trim() : ""
      const statusStr = typeof params?.status === "string" ? params.status.trim() : ""
      const offset = Number(params?.offset) || 0
      const limit = Number(params?.limit) || 50

      const cacheKey = `bookings:page_data:${startStr || "all"}:${endStr || "all"}:${statusStr || "all"}:${searchStr || "none"}:${offset}:${limit}`

      return await cacheFetch(
        cacheKey,
        async () => {
          const dateFilterStart = startStr ? startStr : "2000-01-01"
          const dateFilterEnd = endStr ? endStr : "2100-01-01"
          const statusFilter = statusStr && statusStr !== "all" ? statusStr : null
          const searchPattern = searchStr ? `%${searchStr}%` : null
          const today = new Date().toISOString().split("T")[0]

          // 1. Fast single query for dashboard stats with FILTER aggregates
          const statsPromise = sql`
            SELECT
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE DATE(booking_date) = ${today}::date)::int as today,
              COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
              COUNT(*) FILTER (WHERE status = 'confirmed')::int as confirmed,
              COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
              COUNT(*) FILTER (WHERE status = 'cancelled')::int as cancelled,
              COALESCE(SUM(total_amount) FILTER (WHERE status IN ('completed', 'confirmed')), 0)::float as revenue
            FROM bookings
            WHERE tenant_id = ${tenantId}
          `

          let countPromise
          let bookingsPromise

          if (!searchPattern) {
            // FAST PATH: Zero joins for count, direct indexed query on bookings
            countPromise = sql`
              SELECT COUNT(*)::int as total
              FROM bookings
              WHERE tenant_id = ${tenantId}
                AND booking_date >= ${dateFilterStart}
                AND booking_date <= ${dateFilterEnd}
                AND (${statusFilter}::text IS NULL OR status = ${statusFilter})
            `

            // Index scan for 50 IDs first, then only join customers/staff/services for those 50 rows
            bookingsPromise = sql`
              WITH paged_bookings AS (
                SELECT
                  b.id,
                  b.booking_number,
                  b.customer_id,
                  b.staff_id,
                  b.booking_date,
                  b.booking_time,
                  b.total_amount,
                  b.status,
                  b.notes,
                  b.created_at
                FROM bookings b
                WHERE b.tenant_id = ${tenantId}
                  AND b.booking_date >= ${dateFilterStart}
                  AND b.booking_date <= ${dateFilterEnd}
                  AND (${statusFilter}::text IS NULL OR b.status = ${statusFilter})
                ORDER BY b.booking_date DESC, b.booking_time DESC
                LIMIT ${limit} OFFSET ${offset}
              )
              SELECT
                pb.id,
                pb.booking_number,
                pb.customer_id,
                pb.staff_id,
                pb.booking_date,
                pb.booking_time,
                pb.total_amount,
                pb.status,
                pb.notes,
                pb.created_at,
                c.full_name AS customer_name,
                c.phone_number AS customer_phone,
                st.name AS staff_name,
                COALESCE(
                  (
                    SELECT STRING_AGG(s.name, ', ')
                    FROM booking_services bs
                    JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
                    WHERE bs.booking_id = pb.id AND bs.tenant_id = ${tenantId}
                  ),
                  ''
                ) AS service_names
              FROM paged_bookings pb
              LEFT JOIN customers c ON pb.customer_id = c.id AND c.tenant_id = ${tenantId}
              LEFT JOIN staff st ON pb.staff_id = st.id AND st.tenant_id = ${tenantId}
              ORDER BY pb.booking_date DESC, pb.booking_time DESC
            `
          } else {
            // SEARCH PATH: Filter by customer name, phone, booking number, or service
            countPromise = sql`
              SELECT COUNT(DISTINCT b.id)::int as total
              FROM bookings b
              LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
              LEFT JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
              LEFT JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
              WHERE b.tenant_id = ${tenantId}
                AND b.booking_date >= ${dateFilterStart}
                AND b.booking_date <= ${dateFilterEnd}
                AND (${statusFilter}::text IS NULL OR b.status = ${statusFilter})
                AND (
                  c.full_name ILIKE ${searchPattern}
                  OR c.phone_number ILIKE ${searchPattern}
                  OR b.booking_number ILIKE ${searchPattern}
                  OR s.name ILIKE ${searchPattern}
                )
            `

            bookingsPromise = sql`
              WITH filtered_bookings AS (
                SELECT DISTINCT b.id
                FROM bookings b
                LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
                LEFT JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
                LEFT JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
                WHERE b.tenant_id = ${tenantId}
                  AND b.booking_date >= ${dateFilterStart}
                  AND b.booking_date <= ${dateFilterEnd}
                  AND (${statusFilter}::text IS NULL OR b.status = ${statusFilter})
                  AND (
                    c.full_name ILIKE ${searchPattern}
                    OR c.phone_number ILIKE ${searchPattern}
                    OR b.booking_number ILIKE ${searchPattern}
                    OR s.name ILIKE ${searchPattern}
                  )
              ),
              paged_bookings AS (
                SELECT b.id, b.booking_number, b.customer_id, b.staff_id, b.booking_date, b.booking_time, b.total_amount, b.status, b.notes, b.created_at
                FROM bookings b
                JOIN filtered_bookings fb ON b.id = fb.id
                ORDER BY b.booking_date DESC, b.booking_time DESC
                LIMIT ${limit} OFFSET ${offset}
              )
              SELECT
                pb.id,
                pb.booking_number,
                pb.customer_id,
                pb.staff_id,
                pb.booking_date,
                pb.booking_time,
                pb.total_amount,
                pb.status,
                pb.notes,
                pb.created_at,
                c.full_name AS customer_name,
                c.phone_number AS customer_phone,
                st.name AS staff_name,
                COALESCE(
                  (
                    SELECT STRING_AGG(s.name, ', ')
                    FROM booking_services bs
                    JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
                    WHERE bs.booking_id = pb.id AND bs.tenant_id = ${tenantId}
                  ),
                  ''
                ) AS service_names
              FROM paged_bookings pb
              LEFT JOIN customers c ON pb.customer_id = c.id AND c.tenant_id = ${tenantId}
              LEFT JOIN staff st ON pb.staff_id = st.id AND st.tenant_id = ${tenantId}
              ORDER BY pb.booking_date DESC, pb.booking_time DESC
            `
          }

          const [statsResult, countResult, bookingsRows] = await Promise.all([
            statsPromise,
            countPromise,
            bookingsPromise,
          ])

          const statsRow = statsResult[0] || {}
          const stats: BookingStats = {
            total: Number(statsRow.total) || 0,
            today: Number(statsRow.today) || 0,
            pending: Number(statsRow.pending) || 0,
            confirmed: Number(statsRow.confirmed) || 0,
            completed: Number(statsRow.completed) || 0,
            cancelled: Number(statsRow.cancelled) || 0,
            revenue: Number(statsRow.revenue) || 0,
          }

          const total = Number(countResult[0]?.total || 0)
          const bookings = bookingsRows.map(mapBookingResult)

          return { bookings, total, stats }
        },
        120
      )
    } catch (error) {
      console.error("Error fetching bookings page data:", error)
      return {
        bookings: [],
        total: 0,
        stats: { total: 0, today: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, revenue: 0 },
      }
    }
  })
}

export async function getBookingsPaginated(
  startDate?: string,
  endDate?: string,
  status?: string,
  search?: string,
  offset: number = 0,
  limit: number = 50
): Promise<{ data: Booking[]; total: number }> {
  const result = await getBookingsPageData({
    startDate,
    endDate,
    status,
    search,
    offset,
    limit,
  })
  return { data: result.bookings, total: result.total }
}
