-- Create auto_consumption_rules table
CREATE TABLE IF NOT EXISTS auto_consumption_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    service_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    consumption_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'ml',
    is_active BOOLEAN NOT NULL DEFAULT true,
    trigger_type VARCHAR(20) NOT NULL DEFAULT 'automatic' CHECK (trigger_type IN ('automatic', 'manual', 'conditional')),
    conditions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create auto_consumption_logs table
CREATE TABLE IF NOT EXISTS auto_consumption_logs (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER NOT NULL,
    service_booking_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    amount_consumed DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'ml',
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (rule_id) REFERENCES auto_consumption_rules(id) ON DELETE CASCADE,
    FOREIGN KEY (service_booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auto_consumption_rules_service_id ON auto_consumption_rules(service_id);
CREATE INDEX IF NOT EXISTS idx_auto_consumption_rules_product_id ON auto_consumption_rules(product_id);
CREATE INDEX IF NOT EXISTS idx_auto_consumption_rules_is_active ON auto_consumption_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_auto_consumption_logs_rule_id ON auto_consumption_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_auto_consumption_logs_service_booking_id ON auto_consumption_logs(service_booking_id);
CREATE INDEX IF NOT EXISTS idx_auto_consumption_logs_product_id ON auto_consumption_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_auto_consumption_logs_triggered_at ON auto_consumption_logs(triggered_at);
CREATE INDEX IF NOT EXISTS idx_auto_consumption_logs_status ON auto_consumption_logs(status);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_auto_consumption_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_auto_consumption_rules_updated_at
    BEFORE UPDATE ON auto_consumption_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_auto_consumption_rules_updated_at();

-- Insert some sample data for testing
INSERT INTO auto_consumption_rules (name, service_id, product_id, consumption_amount, unit, trigger_type) VALUES
('Hair Wash Shampoo Usage', 1, 1, 15.0, 'ml', 'automatic'),
('Facial Cleanser Usage', 2, 2, 10.0, 'ml', 'automatic'),
('Massage Oil Usage', 3, 3, 20.0, 'ml', 'manual')
ON CONFLICT DO NOTHING;
