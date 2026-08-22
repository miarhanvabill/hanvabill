import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
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
    return NextResponse.json({ success: true })
  } catch(e) {
    console.error("Migration failed:", e);
    return NextResponse.json({ success: false, error: e.message })
  }
}
