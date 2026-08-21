const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const bookingsCols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bookings'
    `;
    console.log("Bookings columns:", bookingsCols.map(c => c.column_name).join(', '));
    
    const customersCols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers'
    `;
    console.log("Customers columns:", customersCols.map(c => c.column_name).join(', '));
  } catch (e) {
    console.error(e);
  }
}
check();
