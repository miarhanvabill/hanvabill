-- This table is automatically created by ensureStoreSettingsTable in app/actions/settings.ts
-- Documenting it here as requested.

CREATE TABLE IF NOT EXISTS store_settings (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'text',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT store_settings_setting_key_unique UNIQUE (tenant_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_store_settings_tenant_key ON store_settings(tenant_id, setting_key);
