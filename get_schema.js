const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function check() {
  try {
    const res = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'services'`;
    console.log("Services Columns:");
    res.forEach(c => console.log(c.column_name + " (" + c.data_type + ")"));
    
    const cat = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'categories'`;
    console.log("\nCategories Columns:");
    cat.forEach(c => console.log(c.column_name + " (" + c.data_type + ")"));
  } catch (e) {
    console.error(e);
  }
}
check();
