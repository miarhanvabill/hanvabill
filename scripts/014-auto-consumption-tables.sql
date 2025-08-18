-- Auto Consumption Rules Table
CREATE TABLE IF NOT EXISTS auto_consumption_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    service_id INTEGER REFERENCES services(id),
    product_id INTEGER REFERENCES products(id),
    consumption_amount DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'ml',
    is_active BOOLEAN DEFAULT true,
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'automatic',
    conditions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES staff(id),
    updated_by INTEGER REFERENCES staff(id)
);

-- Auto Consumption Logs Table
CREATE TABLE IF NOT EXISTS auto_consumption_logs (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES auto_consumption_rules(id),
    service_booking_id INTEGER REFERENCES bookings(id),
    product_id INTEGER REFERENCES products(id),
    amount_consumed DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    error_message TEXT,
    created_by INTEGER REFERENCES staff(id)
);

-- Auto Consumption Statistics Table
CREATE TABLE IF NOT EXISTS auto_consumption_stats (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES auto_consumption_rules(id),
    date DATE NOT NULL,
    total_consumptions INTEGER DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    avg_consumption_per_service DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rule_id, date)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auto_consumption_rules_service ON auto_consumption_rules(service_id);
CREATE INDEX IF NOT EXISTS idx_auto_consumption_rules_product ON auto_consumption_rules(product_id);
CREATE INDEX IF NOT EXISTS idx_auto_consumption_rules_active ON auto_consumption_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_consumption_logs_rule ON auto_consumption_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_auto_consumption_logs_booking ON auto_consumption_logs(service_booking_id);
CREATE INDEX IF NOT EXISTS idx_auto_consumption_logs_date ON auto_consumption_logs(triggered_at);
CREATE INDEX IF NOT EXISTS idx_auto_consumption_stats_rule_date ON auto_consumption_stats(rule_id, date);

-- Insert sample auto consumption rules
INSERT INTO auto_consumption_rules (name, service_id, product_id, consumption_amount, unit, is_active, trigger_type, conditions) VALUES
('Hair Color - Developer Consumption', 1, 1, 50.00, 'ml', true, 'automatic', '["service_started"]'),
('Facial - Cleanser Usage', 2, 2, 15.00, 'ml', true, 'automatic', '["service_started"]'),
('Manicure - Base Coat Application', 3, 3, 2.00, 'ml', false, 'manual', '[]'),
('Massage - Oil Consumption', 4, 4, 25.00, 'ml', true, 'conditional', '["service_duration > 30min"]'),
('Hair Cut - Shampoo Usage', 5, 5, 20.00, 'ml', true, 'automatic', '["service_started"]'),
('Pedicure - Foot Cream Application', 6, 6, 10.00, 'ml', true, 'automatic', '["service_started"]');

-- Insert sample consumption logs
INSERT INTO auto_consumption_logs (rule_id, service_booking_id, product_id, amount_consumed, unit, cost, status, triggered_at) VALUES
(1, 1, 1, 50.00, 'ml', 2.25, 'completed', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
(2, 2, 2, 15.00, 'ml', 1.80, 'completed', CURRENT_TIMESTAMP - INTERVAL '4 hours'),
(4, 3, 4, 25.00, 'ml', 3.75, 'completed', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
(1, 4, 1, 50.00, 'ml', 2.25, 'pending', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
(5, 5, 5, 20.00, 'ml', 1.50, 'completed', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
(6, 6, 6, 10.00, 'ml', 2.00, 'completed', CURRENT_TIMESTAMP - INTERVAL '5 hours');

-- Insert sample consumption statistics
INSERT INTO auto_consumption_stats (rule_id, date, total_consumptions, total_amount, total_cost, avg_consumption_per_service) VALUES
(1, CURRENT_DATE, 8, 400.00, 18.00, 50.00),
(2, CURRENT_DATE, 5, 75.00, 9.00, 15.00),
(4, CURRENT_DATE, 6, 150.00, 22.50, 25.00),
(5, CURRENT_DATE, 4, 80.00, 6.00, 20.00),
(6, CURRENT_DATE, 3, 30.00, 6.00, 10.00),
(1, CURRENT_DATE - INTERVAL '1 day', 6, 300.00, 13.50, 50.00),
(2, CURRENT_DATE - INTERVAL '1 day', 4, 60.00, 7.20, 15.00),
(4, CURRENT_DATE - INTERVAL '1 day', 5, 125.00, 18.75, 25.00);

-- Update trigger for auto_consumption_rules
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

-- Update trigger for auto_consumption_stats
CREATE OR REPLACE FUNCTION update_auto_consumption_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_auto_consumption_stats_updated_at
    BEFORE UPDATE ON auto_consumption_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_auto_consumption_stats_updated_at();
