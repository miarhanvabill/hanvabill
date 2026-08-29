"use server"
import { sql } from "@/lib/db"
import { withTenantAuth } from "@/lib/withTenantAuth"
import { cacheFetch } from "@/lib/cache"
import type { Booking } from "./bookings"

function mapBookingResult(booking: any): Booking {
  return {
    ...booking,
    id: Number(booking.id),
    customer_id: Number(booking.customer_id),
    staff_id: Number(booking.staff_id),
    total_amount: Number(booking.total_amount),
    rating: booking.rating ? Number(booking.rating) : null,
  }
}

export async function getBookingsPaginated(
  startDate?: string, 
  endDate?: string, 
  status?: string, 
  search?: string, 
  offset: number = 0, 
  limit: number = 50
): Promise<{ data: Booking[], total: number }> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const startStr = typeof startDate === 'string' ? startDate : '';
      const endStr = typeof endDate === 'string' ? endDate : '';
      const searchStr = typeof search === 'string' ? search : '';
      const statusStr = typeof status === 'string' ? status : '';

      const cacheKey = `bookings:paginated:${startStr || "all"}:${endStr || "all"}:${statusStr || "all"}:${searchStr || "none"}:${offset}:${limit}`

      return await cacheFetch(
        cacheKey,
        async () => {
          const searchPattern = searchStr ? `%${searchStr}%` : null
          const dateFilterStart = startStr ? startStr : '2000-01-01'
          const dateFilterEnd = endStr ? endStr : '2100-01-01'
          const statusFilter = statusStr && statusStr !== 'all' ? statusStr : null

          // Get total count
          const countResult = await sql`
            SELECT COUNT(DISTINCT b.id) as total
            FROM bookings b
            LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
            LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
            LEFT JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
            LEFT JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
            WHERE b.tenant_id = ${tenantId}
              AND b.booking_date >= ${dateFilterStart}
              AND b.booking_date <= ${dateFilterEnd}
              AND (${statusFilter}::text IS NULL OR b.status = ${statusFilter})
              AND (${searchPattern}::text IS NULL OR c.full_name ILIKE ${searchPattern} OR c.phone_number ILIKE ${searchPattern} OR s.name ILIKE ${searchPattern})
          `
          const total = Number(countResult[0]?.total || 0)

          // Get data
          const bookings = await sql`
            SELECT
              b.id,
              b.booking_number,
              b.customer_id,
              b.staff_id,
              STRING_AGG(s.name, ', ') AS service_name,
              st.name AS staff_name,
              c.full_name AS customer_name,
              c.phone_number AS customer_phone,
              b.booking_date,
              b.booking_time,
              b.total_amount,
              b.status,
              r.rating,
              b.notes,
              b.created_at
            FROM bookings b
            LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
            LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = ${tenantId}
            LEFT JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
            LEFT JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
            LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = ${tenantId}
            WHERE b.tenant_id = ${tenantId}
              AND b.booking_date >= ${dateFilterStart}
              AND b.booking_date <= ${dateFilterEnd}
              AND (${statusFilter}::text IS NULL OR b.status = ${statusFilter})
              AND (${searchPattern}::text IS NULL OR c.full_name ILIKE ${searchPattern} OR c.phone_number ILIKE ${searchPattern} OR s.name ILIKE ${searchPattern})
            GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, c.phone_number, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
            ORDER BY b.booking_date DESC, b.booking_time DESC
            LIMIT ${limit} OFFSET ${offset}
          `
          
          return { data: bookings.map(mapBookingResult), total }
        },
        180
      )
    } catch (error) {
      console.error("Error fetching bookings:", error)
      return { data: [], total: 0 }
    }
  })
}
