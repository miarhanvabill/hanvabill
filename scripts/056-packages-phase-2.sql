-- scripts/056-packages-phase-2.sql
ALTER TABLE service_packages 
ADD COLUMN IF NOT EXISTS is_transferable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_multi_branch BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS customer_packages (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    package_id INTEGER REFERENCES service_packages(id) ON DELETE CASCADE,
    total_services JSONB NOT NULL,
    remaining_services JSONB NOT NULL,
    expires_at DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
