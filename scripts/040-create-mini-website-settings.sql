CREATE TABLE IF NOT EXISTS mini_website_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    custom_url_slug VARCHAR(255) UNIQUE,
    theme_color VARCHAR(50) DEFAULT '#000000',
    show_services BOOLEAN DEFAULT TRUE,
    show_products BOOLEAN DEFAULT TRUE,
    show_staff BOOLEAN DEFAULT TRUE,
    show_reviews BOOLEAN DEFAULT TRUE,
    banner_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_mini_website_settings_tenant_id ON mini_website_settings(tenant_id);

-- Enable RLS
ALTER TABLE mini_website_settings ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists
DROP POLICY IF EXISTS mini_website_settings_tenant_isolation_policy ON mini_website_settings;

-- Create policy for tenant isolation
CREATE POLICY mini_website_settings_tenant_isolation_policy ON mini_website_settings
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
