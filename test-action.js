require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function main() {
  const tenantId = 'tenant_2kK6rL4lR9gA8B0P2xV5yQ1wE8Z'; // just a guess or dummy
  const startIso = '2026-08-01';
  
  // Just try to run the new query
  try {
      const demoResult = await sql`
        SELECT
          COUNT(DISTINCT b.customer_id) FILTER (WHERE c.gender='male') AS male,
          COUNT(DISTINCT b.customer_id) FILTER (WHERE c.gender='female') AS female,
          COUNT(DISTINCT b.id) FILTER (WHERE b.customer_id IS NULL) + COUNT(DISTINCT b.customer_id) FILTER (WHERE c.gender NOT IN ('male','female') OR c.gender IS NULL) AS others
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
        WHERE b.tenant_id = ${tenantId}
          AND b.booking_date >= ${startIso}
          AND b.status = 'completed'
      `;
      console.log('Success!', demoResult);
  } catch (err) {
      console.error('Error:', err.message);
  }
}
main();
