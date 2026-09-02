const { neon } = require('@neondatabase/serverless');
const sql = neon("postgresql://neondb_owner:npg_zL01wFmKjDce@ep-muddy-pine-a1a7s3e4-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require");

async function main() {
  try {
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;`;
    console.log("Added to products");
    await sql`ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS image_url TEXT;`;
    console.log("Added to packages");
    await sql`ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS image_url TEXT;`;
    console.log("Added to memberships");
  } catch (e) {
    console.error(e);
  }
}
main();
