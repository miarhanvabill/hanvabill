const { neon } = require('@neondatabase/serverless');

const sql = neon("postgresql://neondb_owner:npg_zL01wFmKjDce@ep-muddy-pine-a1a7s3e4-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require");

async function check() {
  try {
    const result = await sql`
      SELECT setting_key, setting_value
      FROM store_settings
      WHERE setting_key LIKE 'profile.%'
    `
    console.log(result);
  } catch(e) {
    console.error(e.message);
  }
}
check();
