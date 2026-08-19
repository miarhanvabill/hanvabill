const fs = require('fs');
let code = fs.readFileSync('app/actions/bookings.ts', 'utf8');

// The replacement code for getBookings
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
      // Return sample data as fallback
      return [
        {
          id: 1,
          booking_number: "BKG001",
          customer_id: 1,
          staff_id: 1,
          service_name: "Hair Cut & Style",
          staff_name: "Priya Sharma",
          customer_name: "Rahul Kumar",
          booking_date: new Date().toISOString().split("T")[0],
          booking_time: "10:00",
          status: "confirmed",
          total_amount: 1500,
          notes: "Regular customer",
          created_at: new Date().toISOString(),
          rating: 5,
        },
        {
          id: 2,
          booking_number: "BKG002",
          customer_id: 2,
          staff_id: 2,
          service_name: "Facial Treatment",
          staff_name: "Anjali Gupta",
          customer_name: "Priya Singh",
          booking_date: new Date().toISOString().split("T")[0],
          booking_time: "14:30",
          status: "pending",
          total_amount: 2500,
          notes: "First time customer",
          created_at: new Date().toISOString(),
          rating: null,
        },
      ]
    }
  })
}`;

code = code.replace(
  /export async function getBookings\(.*?\) \{[\s\S]*?return \[\s*\{\s*id: 1,[\s\S]*?\}\s*\]\n    \}\n  \}\)\n\}/,
  newGetBookings.trim()
);

fs.writeFileSync('app/actions/bookings.ts', code);
