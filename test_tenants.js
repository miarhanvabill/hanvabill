const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const tenants = await sql`SELECT id, tenant_key, slug FROM tenants`;
    console.log(tenants);
  } catch (e) {
    console.error(e);
  }
}
check();
