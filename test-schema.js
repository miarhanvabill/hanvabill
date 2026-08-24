const { neon } = require('@neondatabase/serverless');
const sql = neon("postgresql://billing_user:1234@localhost:5432/billing_db");
async function main() {
  try {
    const res = await sql`
      SELECT column_name, is_nullable, column_default, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_messages';
    `;
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
main();
