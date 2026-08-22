-- Create tenant_users table
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    clerk_user_id TEXT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role_id TEXT,
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, email),
    UNIQUE(tenant_id, phone)
);

-- RLS Policies
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tenant users"
    ON tenant_users FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Users can insert tenant users in their tenant"
    ON tenant_users FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Users can update their tenant users"
    ON tenant_users FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Users can delete their tenant users"
    ON tenant_users FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
