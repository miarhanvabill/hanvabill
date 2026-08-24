import { sql } from "@vercel/postgres"
import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  try {
    const tenantId = 'test'
    const startIso = '2026-07-25'
    const res = await sql`
        SELECT
          COUNT(DISTINCT b.customer_id) FILTER (WHERE c.gender='male') AS male,
          COUNT(DISTINCT b.customer_id) FILTER (WHERE c.gender='female') AS female,
          COUNT(DISTINCT b.id) FILTER (WHERE b.customer_id IS NULL) + COUNT(DISTINCT b.customer_id) FILTER (WHERE c.gender NOT IN ('male','female') OR c.gender IS NULL) AS others
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id AND c.tenant_id = ${tenantId}
        WHERE b.tenant_id = ${tenantId}
          AND b.booking_date >= ${startIso}
          AND b.status = 'completed'
    `
    console.log(res)
  } catch (e) {
    console.error(e)
  }
}
main()
