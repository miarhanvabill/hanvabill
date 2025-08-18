-- Additional tables for complete functionality

-- Cash registers table
CREATE TABLE IF NOT EXISTS cash_registers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    opening_balance DECIMAL(10,2) DEFAULT 0,
    current_balance DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cash transactions table
CREATE TABLE IF NOT EXISTS cash_transactions (
    id SERIAL PRIMARY KEY,
    register_id INTEGER REFERENCES cash_registers(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('cash_in', 'cash_out')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marketing campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'whatsapp')),
    subject VARCHAR(500),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'scheduled', 'completed', 'paused')),
    segment_id INTEGER,
    sent_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    budget DECIMAL(10,2),
    scheduled_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer segments table
CREATE TABLE IF NOT EXISTS customer_segments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    criteria TEXT NOT NULL,
    customer_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    booking_id INTEGER REFERENCES bookings(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    platform VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User consent forms table
CREATE TABLE IF NOT EXISTS consent_forms (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    form_type VARCHAR(100) NOT NULL,
    form_data JSONB,
    signed_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    phone_number VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'template')),
    message_content TEXT,
    direction VARCHAR(20) CHECK (direction IN ('inbound', 'outbound')),
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business analytics table
CREATE TABLE IF NOT EXISTS business_analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2),
    metric_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, metric_name)
);

-- Insert sample data for cash registers
INSERT INTO cash_registers (name, location, opening_balance, current_balance) VALUES
('Main Counter', 'Front Desk', 5000.00, 12500.00),
('Service Counter', 'Service Area', 2000.00, 3750.00);

-- Insert sample cash transactions
INSERT INTO cash_transactions (register_id, type, amount, description, category, reference) VALUES
(1, 'cash_in', 500.00, 'Hair cut service', 'sales', '#13642260'),
(1, 'cash_out', 150.00, 'Office supplies', 'expense', 'EXP001'),
(2, 'cash_in', 300.00, 'Massage service', 'sales', '#13642261');

-- Insert sample marketing campaigns
INSERT INTO marketing_campaigns (name, type, subject, message, status, sent_count, opened_count, clicked_count, revenue, budget) VALUES
('Summer Sale 2024', 'email', 'Get 25% off on all services!', 'Don''t miss our biggest sale of the year. Book now and save 25% on all salon services.', 'active', 1250, 306, 45, 15600.00, 2000.00),
('Birthday Special', 'sms', NULL, 'Happy Birthday! Enjoy a complimentary service on your special day.', 'scheduled', 0, 0, 0, 0.00, 500.00);

-- Insert sample customer segments
INSERT INTO customer_segments (name, criteria, customer_count) VALUES
('VIP Customers', 'Total spent > ₹10,000', 45),
('New Customers', 'First visit within 30 days', 128),
('Inactive Customers', 'No visit in last 90 days', 67);

-- Insert sample reviews
INSERT INTO reviews (customer_id, rating, review_text, platform, status) VALUES
(1, 5, 'Excellent service! Very professional staff and great ambiance.', 'Google', 'approved'),
(2, 4, 'Good haircut, will come back again.', 'Facebook', 'approved'),
(3, 5, 'Amazing experience, highly recommended!', 'Google', 'approved');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cash_transactions_register ON cash_transactions(register_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON cash_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_customer ON whatsapp_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_business_analytics_date ON business_analytics(date);
