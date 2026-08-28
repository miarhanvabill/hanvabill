const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function run() {
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS resource_id INTEGER REFERENCES business_resources(id);`;
    console.log("Migration successful");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}
run();
