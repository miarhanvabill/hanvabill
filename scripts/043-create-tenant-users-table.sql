-- Create tenant_users table
CREATE TABLE IF NOT EXISTS tenant_users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    clerk_user_id TEXT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(tenant_id, email),
    UNIQUE(tenant_id, phone)
);
