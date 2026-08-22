const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("No DATABASE_URL found");
    return;
  }
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    const migration = fs.readFileSync('scripts/039-create-billing-tables.sql', 'utf8');
    await sql(migration);
    console.log("Migration executed successfully.");
  } catch (err) {
    console.error(err);
  }
}

run();
