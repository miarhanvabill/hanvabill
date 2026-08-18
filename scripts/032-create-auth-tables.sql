-- Create authentication and multi-tenancy tables for Clerk integration
-- This script creates the core tables needed for the auth system

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create membership table for user-tenant relationships
CREATE TABLE IF NOT EXISTS membership (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id_from_clerk VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id_from_clerk, tenant_id)
);

-- Create app_user table for compatibility
CREATE TABLE IF NOT EXISTS app_user (
    id SERIAL PRIMARY KEY,
    user_id_from_clerk VARCHAR(255) NOT NULL,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id_from_clerk, tenant_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_membership_user_id ON membership(user_id_from_clerk);
CREATE INDEX IF NOT EXISTS idx_membership_tenant_id ON membership(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_user_user_id ON app_user(user_id_from_clerk);
CREATE INDEX IF NOT EXISTS idx_app_user_tenant_id ON app_user(tenant_id);

-- Add tenant_id column to existing tables if not present
DO $$ 
BEGIN
    -- Add tenant_id to customers table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tenant_id') THEN
        ALTER TABLE customers ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
    END IF;
    
    -- Add tenant_id to bookings table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'tenant_id') THEN
        ALTER TABLE bookings ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
    END IF;
    
    -- Add tenant_id to staff table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'tenant_id') THEN
        ALTER TABLE staff ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
    END IF;
    
    -- Add tenant_id to services table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'tenant_id') THEN
        ALTER TABLE services ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
    END IF;
    
    -- Add tenant_id to invoices table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'tenant_id') THEN
        ALTER TABLE invoices ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
    END IF;
END $$;

-- Create a default tenant for existing data
INSERT INTO tenants (name, created_at) 
VALUES ('Default Salon', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Update existing records to use the default tenant
UPDATE customers SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE bookings SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE staff SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE services SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE invoices SET tenant_id = 1 WHERE tenant_id IS NULL;
