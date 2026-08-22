const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function check() {
  try {
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products'
    `;
    console.log("Products Columns:", cols.map(c => `${c.column_name} (${c.data_type})`).join(", "));
  } catch (e) {
    console.error(e);
  }
}
check();
