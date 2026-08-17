-- Multi-tenant Database Schema Migration

-- 1. Create the `tenants` table
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create the `users` table for authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert a default tenant and user so the system doesn't break
INSERT INTO tenants (id, name, domain) 
VALUES (1, 'Glamour Salon (Demo)', 'demo.glamour.local') 
ON CONFLICT (id) DO NOTHING;

-- Default password is 'password123' (hashed using bcrypt for demo purposes)
-- In production, NEVER use hardcoded hashes.
INSERT INTO users (tenant_id, email, password_hash, role)
VALUES (1, 'admin@glamour.local', '$2a$10$9Gf.xGg7p.hR3F9C.V4uHu6n4D4bK6L.Z6qX.8l/sY/6jV.u5H.Pq', 'admin')
ON CONFLICT (email) DO NOTHING;


-- 3. Add `tenant_id` to all existing operational tables

-- Helper block to safely add columns (so it doesn't fail if ran twice)
DO $$
DECLARE
    t_name text;
    tables_to_migrate text[] := ARRAY['customers', 'staff', 'bookings', 'invoices', 'services', 'inventory', 'gift_cards', 'coupons'];
BEGIN
    FOREACH t_name IN ARRAY tables_to_migrate
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
            -- Check if column exists
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'tenant_id') THEN
                EXECUTE 'ALTER TABLE ' || quote_ident(t_name) || ' ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE';
                
                -- Set default tenant_id for existing records
                EXECUTE 'UPDATE ' || quote_ident(t_name) || ' SET tenant_id = 1 WHERE tenant_id IS NULL';
                
                -- Make tenant_id NOT NULL
                EXECUTE 'ALTER TABLE ' || quote_ident(t_name) || ' ALTER COLUMN tenant_id SET NOT NULL';
                
                -- Create an index for performance since we will filter by tenant_id on EVERY query
                EXECUTE 'CREATE INDEX ' || quote_ident(t_name || '_tenant_id_idx') || ' ON ' || quote_ident(t_name) || ' (tenant_id)';
            END IF;
        END IF;
    END LOOP;
END
$$;

-- 4. Set up Row Level Security (RLS) - Recommended for Multi-Tenant apps
-- To enforce this, every query MUST set the current tenant context.
-- Alternatively, we can handle it at the application layer by always adding `WHERE tenant_id = X`.
-- Given we are using raw SQL queries with `@neondatabase/serverless`, application-level `WHERE` is safer
-- and easier to implement without complex Postgres connection state management.
