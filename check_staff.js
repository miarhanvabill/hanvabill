const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function check() {
  try {
    const res = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%staff%'`;
    console.log("Tables:");
    res.forEach(t => console.log(t.table_name));
    
    if (res.length > 0) {
      const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = \$\{res[0].table_name\}`;
      console.log("\nColumns for", res[0].table_name, ":", cols.map(c => c.column_name).join(", "));
    }
  } catch (e) {
    console.error(e);
  }
}
check();
