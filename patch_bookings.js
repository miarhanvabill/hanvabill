const fs = require('fs');
let code = fs.readFileSync('app/actions/bookings.ts', 'utf8');

const lines = code.split('\n');

const getBookingsStartIndex = lines.findIndex(l => l.startsWith('export async function getBookings(date?: string, status?: string, search?: string): Promise<Booking[]> {'));
const nextFunctionIndex = lines.findIndex((l, i) => i > getBookingsStartIndex && l.startsWith('export async function getBookingServices'));

const newGetBookings = `
export async function getBookings(startDate?: string, endDate?: string, status?: string, search?: string): Promise<Booking[]> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    try {
      const startStr = typeof startDate === 'string' ? startDate : '';
      const endStr = typeof endDate === 'string' ? endDate : '';
      const searchStr = typeof search === 'string' ? search : '';
      const statusStr = typeof status === 'string' ? status : '';

      const cacheKey = \`bookings:\${startStr || "all"}:\${endStr || "all"}:\${statusStr || "all"}:\${searchStr || "none"}\`

      return await cacheFetch(
        cacheKey,
        async () => {
          const searchPattern = searchStr ? \`%\${searchStr}%\` : null
          const dateFilterStart = startStr ? startStr : '2000-01-01'
          const dateFilterEnd = endStr ? endStr : '2100-01-01'
          const statusFilter = statusStr && statusStr !== 'all' ? statusStr : null

          const bookings = await sql\`
            SELECT
              b.id,
              b.booking_number,
              b.customer_id,
              b.staff_id,
              STRING_AGG(s.name, ', ') AS service_name,
              st.name AS staff_name,
              c.full_name AS customer_name,
              b.booking_date,
              b.booking_time,
              b.status,
              b.total_amount,
              b.notes,
              b.created_at,
              r.rating
            FROM bookings b
            JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = \${tenantId}
            JOIN services s ON bs.service_id = s.id AND s.tenant_id = \${tenantId}
            LEFT JOIN staff st ON b.staff_id = st.id AND st.tenant_id = \${tenantId}
            LEFT JOIN reviews r ON b.id = r.booking_id AND r.tenant_id = \${tenantId}
            LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = \${tenantId}
            WHERE b.tenant_id = \${tenantId}
              AND b.booking_date >= \${dateFilterStart}
              AND b.booking_date <= \${dateFilterEnd}
              AND (\${statusFilter}::text IS NULL OR b.status = \${statusFilter})
              AND (\${searchPattern}::text IS NULL OR c.full_name ILIKE \${searchPattern} OR c.phone_number ILIKE \${searchPattern} OR s.name ILIKE \${searchPattern})
            GROUP BY b.id, b.booking_number, b.customer_id, b.staff_id, st.name, c.full_name, b.booking_date, b.booking_time, b.status, b.total_amount, b.notes, b.created_at, r.rating
            ORDER BY b.booking_date DESC, b.booking_time DESC
          \`
          return bookings.map(mapBookingResult)
        },
        180, // Cache for 3 minutes
      )
    } catch (error) {
      console.error("Error fetching bookings:", error)
      return []
    }
  })
}
`;

lines.splice(getBookingsStartIndex, nextFunctionIndex - getBookingsStartIndex, newGetBookings.trim(), '');

fs.writeFileSync('app/actions/bookings.ts', lines.join('\n'));
