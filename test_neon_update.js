const { neon } = require('@neondatabase/serverless');

// Using the provided database URL just to check the schema of the returned object
const sql = neon(process.env.DATABASE_URL || "postgresql://neondb_owner:npg_zL01wFmKjDce@ep-muddy-pine-a1a7s3e4-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require");

async function check() {
  try {
    const updateResult = await sql`UPDATE store_settings SET setting_value = 'test' WHERE 1=0`;
    console.log("Update result:", updateResult);
    console.log("Keys:", Object.keys(updateResult));
  } catch(e) {
    console.error(e);
  }
}
check();
