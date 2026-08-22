-- Create tenant_roles table
CREATE TABLE IF NOT EXISTS tenant_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, name)
);

-- Create tenant_role_permissions table
CREATE TABLE IF NOT EXISTS tenant_role_permissions (
    role_id UUID NOT NULL REFERENCES tenant_roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

-- RLS Policies for tenant_roles
ALTER TABLE tenant_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view roles in their tenant"
    ON tenant_roles FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Users can insert roles in their tenant"
    ON tenant_roles FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Users can update roles in their tenant"
    ON tenant_roles FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Users can delete roles in their tenant"
    ON tenant_roles FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- No RLS needed on tenant_role_permissions since it's a join table managed via role_id, 
-- but let's add it to be safe or just leave it relying on tenant_roles.
-- Wait, role_id is not enough to filter by tenant_id directly without a JOIN.
-- Let's just add tenant_id to tenant_role_permissions if we want RLS, or not use RLS for it, or use a join policy.
-- Actually, the other scripts didn't use RLS for join tables. We can just skip RLS or add a simple policy.
-- Actually, the user's setup might just bypass RLS if using a postgres role that overrides it, but let's do it safely.
