const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const sql = neon("postgresql://neondb_owner:npg_zL01wFmKjDce@ep-muddy-pine-a1a7s3e4-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require");

async function runMigration() {
  try {
    console.log("Running migration...");
    
    // 1. cash_registers
    await sql`ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;`;
    await sql`UPDATE cash_registers SET tenant_id = 1 WHERE tenant_id IS NULL;`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant_id ON cash_registers(tenant_id);`;
    
    // 2. cash_transactions
    await sql`ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;`;
    await sql`UPDATE cash_transactions SET tenant_id = 1 WHERE tenant_id IS NULL;`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant_id ON cash_transactions(tenant_id);`;
    
    console.log("Migration complete!");
  } catch(e) {
    console.error("Migration failed:", e.message);
  }
}
runMigration();
