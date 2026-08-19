const { neon } = require('@neondatabase/serverless');

const sql = neon("postgresql://neondb_owner:npg_zL01wFmKjDce@ep-muddy-pine-a1a7s3e4-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require");

async function check() {
  try {
    const result = await sql`
      SELECT i.*, c.full_name as customer_name, c.phone_number as customer_phone, c.email as customer_email
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.share_token = '05d95cfed056a3f69b977e85ae5e79b7'
      LIMIT 1
    `
    console.log(result);
  } catch(e) {
    console.error(e);
  }
}
check();
