import 'dotenv/config';
import { sql } from '@vercel/postgres';

async function run() {
  try {
    const res1 = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'id'`;
    console.log('tenants.id type:', res1.rows[0].data_type);
  } catch(e) {
    console.log(e);
  }
}
run();
