import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  try {
    await sql`ALTER TABLE revenue_goals ADD COLUMN IF NOT EXISTS staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE;`;
    await sql`ALTER TABLE revenue_goals ADD COLUMN IF NOT EXISTS goal_type VARCHAR(20) DEFAULT 'monthly';`;
    await sql`ALTER TABLE revenue_goals ADD COLUMN IF NOT EXISTS description TEXT;`;
    console.log("Schema updated successfully!");
  } catch (e) {
    console.error("Error:", e);
  }
}
main();
