import 'dotenv/config';
import { sql } from '@vercel/postgres';

async function run() {
  try {
    const res = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'loyalty_transactions' AND column_name = 'expires_at'
    `;
    console.log(res.rows);
  } catch(e) {
    console.log(e);
  }
}
run();
