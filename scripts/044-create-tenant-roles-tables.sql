-- Create tenant_roles table
CREATE TABLE IF NOT EXISTS tenant_roles (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    color VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name)
);

-- Create tenant_permissions table
CREATE TABLE IF NOT EXISTS tenant_permissions (
    id VARCHAR(100) PRIMARY KEY, -- e.g., 'dashboard.view'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    level VARCHAR(50) NOT NULL -- 'basic', 'advanced', 'critical'
);

-- Create tenant_role_permissions table
CREATE TABLE IF NOT EXISTS tenant_role_permissions (
    role_id INTEGER NOT NULL REFERENCES tenant_roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(100) NOT NULL REFERENCES tenant_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(role_id, permission_id)
);

-- Insert default permissions
INSERT INTO tenant_permissions (id, name, description, category, level) VALUES
('dashboard.view', 'View Dashboard', 'Access main dashboard', 'dashboard', 'basic'),
('dashboard.analytics', 'View Analytics', 'Access analytics widgets', 'dashboard', 'advanced'),
('users.view', 'View Users', 'View user directory', 'users', 'basic'),
('users.create', 'Create Users', 'Add new users', 'users', 'advanced'),
('users.edit', 'Edit Users', 'Modify user details', 'users', 'advanced'),
('users.delete', 'Delete Users', 'Remove users', 'users', 'critical'),
('roles.view', 'View Roles', 'View role configurations', 'roles', 'advanced'),
('roles.manage', 'Manage Roles', 'Create and edit roles', 'roles', 'critical'),
('billing.view', 'View Billing', 'View invoices and subscriptions', 'billing', 'advanced'),
('billing.manage', 'Manage Billing', 'Process payments and refunds', 'billing', 'critical'),
('settings.view', 'View Settings', 'View system settings', 'settings', 'basic'),
('settings.manage', 'Manage Settings', 'Modify system settings', 'settings', 'critical')
ON CONFLICT (id) DO NOTHING;
