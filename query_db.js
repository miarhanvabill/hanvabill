const { neon } = require('@neondatabase/serverless');

async function check() {
  const sql = neon("postgresql://hanvabill_owner:npg_1mGzSIsd6yXY@ep-muddy-pine-a1a7s3e4-pooler.ap-southeast-1.aws.neon.tech/hanvabill?sslmode=require");
  try {
    const rows = await sql`SELECT setting_key, setting_value FROM store_settings LIMIT 20`;
    console.log("DB Rows:", rows);
  } catch (err) {
    console.error(err);
  }
}
check();
