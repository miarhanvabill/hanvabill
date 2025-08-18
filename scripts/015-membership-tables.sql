-- Create membership_plans table
CREATE TABLE IF NOT EXISTS membership_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    duration_months INTEGER NOT NULL DEFAULT 12,
    benefits JSONB DEFAULT '[]',
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    max_bookings_per_month INTEGER DEFAULT 0,
    priority_booking BOOLEAN DEFAULT false,
    free_services INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customer_memberships table
CREATE TABLE IF NOT EXISTS customer_memberships (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES membership_plans(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
    bookings_used INTEGER DEFAULT 0,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample membership plans
INSERT INTO membership_plans (name, description, price, duration_months, benefits, discount_percentage, max_bookings_per_month, priority_booking, free_services, is_active) VALUES
('Gold Membership', 'Premium membership with exclusive benefits', 299.00, 12, '["20% discount on all services", "Priority booking", "Free monthly facial", "Complimentary products"]', 20.00, 8, true, 1, true),
('Silver Membership', 'Great value membership for regular customers', 199.00, 12, '["15% discount on all services", "Priority booking", "Birthday special"]', 15.00, 6, true, 0, true),
('Bronze Membership', 'Entry-level membership with basic benefits', 99.00, 6, '["10% discount on all services", "Member-only promotions"]', 10.00, 4, false, 0, true);

-- Insert sample customer memberships (assuming customers exist)
INSERT INTO customer_memberships (customer_id, plan_id, start_date, end_date, status, bookings_used, amount_paid) VALUES
(1, 1, '2024-01-01', '2024-12-31', 'active', 5, 299.00),
(2, 2, '2024-02-01', '2025-01-31', 'active', 3, 199.00),
(3, 1, '2023-06-01', '2024-05-31', 'expired', 8, 299.00);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON membership_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_status ON customer_memberships(status);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_customer_id ON customer_memberships(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_plan_id ON customer_memberships(plan_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_membership_plans_updated_at BEFORE UPDATE ON membership_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_memberships_updated_at BEFORE UPDATE ON customer_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
