const { neon } = require('@neondatabase/serverless');
const sql = neon("postgresql://billing_user:1234@localhost:5432/billing_db");
async function main() {
  try {
    const res = await sql`SELECT 1 as num`;
    console.log(Array.isArray(res) ? 'ARRAY' : 'NOT ARRAY');
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
main();
