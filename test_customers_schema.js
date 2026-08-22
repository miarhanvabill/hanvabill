const { neon } = require('@neondatabase/serverless');

async function check() {
  const sql = neon('postgresql://neondb_owner:npg_1Ith8nUxyoDS@ep-long-scene-a19t43g8-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
  try {
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customers'
    `;
    console.log("Customers Columns:", cols.map(c => c.column_name).join(", "));
  } catch (e) {
    console.error(e);
  }
}
check();
