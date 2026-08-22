-- Add tenant_id to auto_consumption_rules and auto_consumption_logs
-- so they participate in multi-tenancy filtering.

DO $$
BEGIN
    -- auto_consumption_rules
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'auto_consumption_rules' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE auto_consumption_rules
            ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
    END IF;

    -- auto_consumption_logs
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'auto_consumption_logs' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE auto_consumption_logs
            ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
    END IF;
END $$;

-- Back-fill existing rows so they belong to the default tenant
UPDATE auto_consumption_rules SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE auto_consumption_logs  SET tenant_id = 1 WHERE tenant_id IS NULL;

-- Indexes for fast tenant-scoped lookups
CREATE INDEX IF NOT EXISTS idx_auto_consumption_rules_tenant ON auto_consumption_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auto_consumption_logs_tenant  ON auto_consumption_logs(tenant_id);
