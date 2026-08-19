const { neon } = require('@neondatabase/serverless');

const sql = neon("postgresql://hanvabill_owner:npg_1mGzSIsd6yXY@ep-muddy-pine-a1a7s3e4-pooler.ap-southeast-1.aws.neon.tech/hanvabill?sslmode=require");

async function check() {
  try {
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reviews'
      )
    `
    console.log("Table exists:", tableExists);
    
    if (tableExists[0]?.exists) {
      const rows = await sql`SELECT * FROM reviews LIMIT 5`;
      console.log("Rows:", rows);
    }
  } catch(e) {
    console.error(e);
  }
}
check();
