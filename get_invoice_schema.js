const { neon } = require('@neondatabase/serverless');

async function check() {
  const sql = neon(process.env.DATABASE_URL || "postgresql://neondb_owner:npg_zL01wFmKjDce@ep-muddy-pine-a1a7s3e4-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require");
  try {
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoices'
    `;
    console.log(cols);
  } catch(e) {
    console.error(e);
  }
}
check();
