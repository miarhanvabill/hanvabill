const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');

async function run() {
  const pool = new Pool({ connectionString: 'postgresql://hanvabill_owner:npg_1mGzSIsd6yXY@ep-muddy-pine-a1a7s3e4-pooler.ap-southeast-1.aws.neon.tech/hanvabill?sslmode=require' });
  try {
    const query = fs.readFileSync('scripts/042-create-notification-tables.sql', 'utf8');
    await pool.query(query);
    console.log("Migration successful");
  } catch(e) {
    console.error("Migration failed:", e);
  } finally {
    await pool.end();
  }
}
run();
