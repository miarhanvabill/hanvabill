require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);

async function test() {
  try {
    const days = 7;
    await sql`SELECT NOW() + INTERVAL '${days} days'`;
    console.log("Success");
  } catch(e) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}
test();
