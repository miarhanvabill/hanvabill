-- Add tenant_id to cash_registers and cash_transactions tables

-- 1. cash_registers
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
UPDATE cash_registers SET tenant_id = 1 WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant_id ON cash_registers(tenant_id);

-- 2. cash_transactions
ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
UPDATE cash_transactions SET tenant_id = 1 WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant_id ON cash_transactions(tenant_id);
