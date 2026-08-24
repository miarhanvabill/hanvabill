const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://billing_user:1234@localhost:5432/billing_db' });
async function main() {
  await client.connect();
  const tenantId = 'tenant_2kK6rL4lR9gA8B0P2xV5yQ1wE8Z';
  const startIso = '2026-08-01';
  try {
    const res = await client.query(`
        SELECT COALESCE(c.lead_source, 'Unknown') AS source,
               COUNT(DISTINCT c.id) AS count
        FROM customers c
        JOIN bookings b ON c.id = b.customer_id AND b.tenant_id = $1
        WHERE c.tenant_id = $1
          AND b.booking_date >= $2
          AND b.status = 'completed'
        GROUP BY COALESCE(c.lead_source, 'Unknown')
    `, [tenantId, startIso]);
    console.log("Q1 success");
  } catch (e) {
    console.error("Q1 error:", e.message);
  }

  try {
    const res = await client.query(`
        SELECT s.name,
               COALESCE(SUM(bs.price * bs.quantity),0) AS prev_revenue
        FROM services s
        LEFT JOIN booking_services bs ON s.id = bs.service_id AND bs.tenant_id = $1
        LEFT JOIN bookings b ON bs.booking_id = b.id AND b.tenant_id = $1
        WHERE b.booking_date >= $2 AND b.booking_date < $2
          AND b.status='completed'
        GROUP BY s.id, s.name
    `, [tenantId, startIso]);
    console.log("Q2 success");
  } catch (e) {
    console.error("Q2 error:", e.message);
  }
  
  process.exit(0);
}
main();
