const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products'
    `);
    console.log(res.rows.map(r => r.column_name).join(', '));
  } catch(e) {
    console.log(e);
  } finally {
    pool.end();
  }
}
run();
