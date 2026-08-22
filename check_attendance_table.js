const { neon } = require('@neondatabase/serverless');

async function check() {
  const sql = neon('postgresql://neondb_owner:npg_1Ith8nUxyoDS@ep-long-scene-a19t43g8-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
  try {
    const cols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attendance'
    `;
    console.log("Attendance Columns:", cols.map(c => c.column_name).join(", "));
    if (cols.length > 0) {
      const count = await sql`SELECT COUNT(*) FROM attendance`;
      console.log("Rows:", count[0].count);
    }
  } catch (e) {
    console.error(e);
  }
}
check();
