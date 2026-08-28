const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://billing_user:1234@localhost:5432/billing_db' });
async function main() {
  await client.connect();
  try {
    await client.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS resource_id INTEGER REFERENCES business_resources(id);`);
    console.log("Migration successful");
  } catch (e) {
    console.error("Migration error:", e.message);
  }
  process.exit(0);
}
main();
