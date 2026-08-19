const fs = require('fs');
let code = fs.readFileSync('app/actions/bookings.ts', 'utf8');

// Replace getBookingStats definition
code = code.replace(
  /export async function getBookingStats\(\): Promise<BookingStats> \{/,
  'export async function getBookingStats(startDate?: string, endDate?: string): Promise<BookingStats> {'
);

// We need to inject startDate and endDate logic into getBookingStats
const newStatsLogic = `
          const today = new Date().toISOString().split("T")[0];
          
          // Build date filter strings for SQL (handling optional dates)
          const dateFilterStart = startDate ? startDate : '2000-01-01';
          const dateFilterEnd = endDate ? endDate : '2100-01-01';

          const [
            totalResult,
            todayResult,
            pendingResult,
            confirmedResult,
            completedResult,
            cancelledResult,
            revenueResult,
          ] = await Promise.all([
            sql\`SELECT COUNT(*) as count FROM bookings WHERE tenant_id = \${tenantId} AND booking_date >= \${dateFilterStart} AND booking_date <= \${dateFilterEnd}\`,
            sql\`SELECT COUNT(*) as count FROM bookings WHERE tenant_id = \${tenantId} AND DATE(booking_date) = \${today} AND booking_date >= \${dateFilterStart} AND booking_date <= \${dateFilterEnd}\`,
            sql\`SELECT COUNT(*) as count FROM bookings WHERE tenant_id = \${tenantId} AND status = 'pending' AND booking_date >= \${dateFilterStart} AND booking_date <= \${dateFilterEnd}\`,
            sql\`SELECT COUNT(*) as count FROM bookings WHERE tenant_id = \${tenantId} AND status = 'confirmed' AND booking_date >= \${dateFilterStart} AND booking_date <= \${dateFilterEnd}\`,
            sql\`SELECT COUNT(*) as count FROM bookings WHERE tenant_id = \${tenantId} AND status = 'completed' AND booking_date >= \${dateFilterStart} AND booking_date <= \${dateFilterEnd}\`,
            sql\`SELECT COUNT(*) as count FROM bookings WHERE tenant_id = \${tenantId} AND status = 'cancelled' AND booking_date >= \${dateFilterStart} AND booking_date <= \${dateFilterEnd}\`,
            sql\`SELECT SUM(total_amount) as total FROM bookings WHERE tenant_id = \${tenantId} AND status = 'completed' AND booking_date >= \${dateFilterStart} AND booking_date <= \${dateFilterEnd}\`,
          ])
`;

code = code.replace(
  /const today = new Date\(\)\.toISOString\(\)\.split\("T"\)\[0\][\s\S]*?sql`SELECT SUM\(total_amount\) as total FROM bookings WHERE tenant_id = \$\{tenantId\} AND status = 'completed'`,[\s\S]*?\]\)/,
  newStatsLogic.trim() + '\n          '
);

// We also need to change caching key for stats
code = code.replace(
  /"bookings:stats",/,
  '`bookings:stats:${startDate || "all"}:${endDate || "all"}`, '
);

fs.writeFileSync('app/actions/bookings.ts', code);
