const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon('postgresql://neondb_owner:npg_1Ith8nUxyoDS@ep-long-scene-a19t43g8-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
          id SERIAL PRIMARY KEY,
          tenant_id VARCHAR(100) NOT NULL,
          date DATE NOT NULL,
          category VARCHAR(100) NOT NULL,
          description TEXT,
          amount DECIMAL(10, 2) NOT NULL,
          payment_method VARCHAR(50),
          vendor VARCHAR(100),
          receipt_url TEXT,
          status VARCHAR(50) DEFAULT 'completed',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("Expenses table created successfully.");
  } catch (err) {
    console.error(err);
  }
}
run();
