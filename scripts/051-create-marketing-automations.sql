-- Create Marketing Automations table
CREATE TABLE IF NOT EXISTS marketing_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    channel TEXT NOT NULL,
    message_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for tenant isolation
CREATE INDEX IF NOT EXISTS idx_marketing_automations_tenant_id ON marketing_automations(tenant_id);

-- Enable RLS (Optional, depending on other tables)
-- ALTER TABLE marketing_automations ENABLE ROW LEVEL SECURITY;
