const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res1 = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'staff'`);
    console.log('staff columns:', res1.rows.map(r => r.column_name).join(', '));
    
    const res2 = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'commission_profiles'`);
    console.log('commission_profiles columns:', res2.rows.map(r => r.column_name).join(', '));
    
    const res3 = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices'`);
    console.log('invoices columns:', res3.rows.map(r => r.column_name).join(', '));
  } catch(e) {
    console.log(e);
  } finally {
    pool.end();
  }
}
run();
