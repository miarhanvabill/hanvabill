-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_discount DECIMAL(10,2),
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_valid_dates ON coupons(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_coupons_created_at ON coupons(created_at);

-- Insert sample coupons
INSERT INTO coupons (code, name, description, discount_type, discount_value, min_order_amount, max_discount, valid_from, valid_until, usage_limit, used_count, is_active) VALUES
('WELCOME10', 'Welcome Offer', '10% off on your first visit', 'percentage', 10, 500, 200, '2025-01-01', '2025-12-31', 100, 25, true),
('SAVE50', 'Flat ₹50 Off', 'Flat ₹50 discount on orders above ₹300', 'fixed', 50, 300, NULL, '2025-01-01', '2025-12-31', 200, 45, true),
('PREMIUM20', 'Premium Service Discount', '20% off on premium services', 'percentage', 20, 1000, 500, '2025-01-01', '2025-12-31', 50, 12, true),
('NEWCLIENT15', 'New Client Special', '15% off for new customers', 'percentage', 15, 800, 300, '2025-01-01', '2025-06-30', 75, 8, true),
('FLAT100', 'Big Savings', 'Flat ₹100 off on orders above ₹600', 'fixed', 100, 600, NULL, '2025-01-01', '2025-12-31', 150, 32, true)
ON CONFLICT (code) DO NOTHING;

-- Create trigger to update updated_at timestamp for coupons
DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
CREATE TRIGGER update_coupons_updated_at 
    BEFORE UPDATE ON coupons 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
