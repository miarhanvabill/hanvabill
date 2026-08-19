import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS coupon_code TEXT,
      ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS loyalty_discount DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS gift_card_discount DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS loyalty_points_balance INTEGER DEFAULT 0;
    `;
    console.log("Migration successful!");
  } catch (err) {
    console.error(err);
  }
}

migrate();
