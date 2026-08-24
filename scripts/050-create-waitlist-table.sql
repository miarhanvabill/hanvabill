-- scripts/050-create-waitlist-table.sql
-- Create table for Smart Waitlist Management

CREATE TABLE IF NOT EXISTS waitlist (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    preferred_staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    preferred_date DATE NOT NULL,
    time_preference VARCHAR(50) DEFAULT 'any', -- 'morning', 'afternoon', 'evening', 'any'
    notes TEXT,
    status VARCHAR(50) DEFAULT 'waiting', -- 'waiting', 'notified', 'booked', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_waitlist_tenant_id ON waitlist(tenant_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_customer_id ON waitlist(customer_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_preferred_date ON waitlist(preferred_date);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
