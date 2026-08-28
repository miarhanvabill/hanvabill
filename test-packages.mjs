import 'dotenv/config';
import { sql } from '@vercel/postgres';

async function run() {
  try {
    const res = await sql`SELECT * FROM service_packages LIMIT 2`;
    console.log(res.rows);
  } catch(e) {
    console.log(e);
  }
}
run();
