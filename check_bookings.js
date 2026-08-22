const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function check() {
  try {
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings'`;
    console.log("Bookings Columns:", cols.map(c => c.column_name).join(", "));
  } catch (e) {
    console.error(e);
  }
}
check();
