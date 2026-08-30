const { neon } = require('@neondatabase/serverless');

async function check() {
  const sql = neon("postgresql://hanvabill_owner:npg_1mGzSIsd6yXY@ep-muddy-pine-a1a7s3e4-pooler.ap-southeast-1.aws.neon.tech/hanvabill?sslmode=require");
  try {
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT`;
    console.log("Column added successfully");
  } catch (err) {
    console.error(err);
  }
}
check();
