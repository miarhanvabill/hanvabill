-- Migration 046: Add tenant_id and location to business_resources; ensure cash tables have tenant_id

-- Add tenant_id to business_resources (multi-tenant support)
ALTER TABLE business_resources ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;

-- Add location to business_resources (used by the Resources page)
ALTER TABLE business_resources ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT 'Main Floor';

-- Backfill existing rows: assign to tenant 1
UPDATE business_resources SET tenant_id = 1 WHERE tenant_id IS NULL;

-- Create index for fast tenant filtering
CREATE INDEX IF NOT EXISTS idx_business_resources_tenant ON business_resources(tenant_id);

-- Add tenant_id to cash_registers if not already present
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
UPDATE cash_registers SET tenant_id = 1 WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant ON cash_registers(tenant_id);

-- Add tenant_id to cash_transactions if not already present
ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1;
UPDATE cash_transactions SET tenant_id = 1 WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant ON cash_transactions(tenant_id);
