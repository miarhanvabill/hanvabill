-- Comprehensive schema update to ensure all required columns exist

-- Update customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sms_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(100),
ADD COLUMN IF NOT EXISTS lead_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS date_of_anniversary DATE,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update bookings table with all required fields
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id),
ADD COLUMN IF NOT EXISTS service_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_ids JSONB,
ADD COLUMN IF NOT EXISTS service_names JSONB,
ADD COLUMN IF NOT EXISTS product_ids JSONB,
ADD COLUMN IF NOT EXISTS product_names JSONB,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS wallet_used DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0;

-- Update services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 18.00,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0;

-- Update staff table
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(20),
ADD COLUMN IF NOT EXISTS skills JSONB,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS shift_start TIME,
ADD COLUMN IF NOT EXISTS shift_end TIME;

-- Create products table if not exists
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2),
    sku VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    brand VARCHAR(100),
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'piece',
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create categories table if not exists
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) CHECK (type IN ('service', 'product')) DEFAULT 'service',
    parent_id INTEGER REFERENCES categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create reviews table if not exists
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    staff_id INTEGER REFERENCES staff(id),
    booking_id INTEGER REFERENCES bookings(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create wallet_transactions table if not exists
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('credit', 'debit')),
    amount DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    description TEXT,
    reference_id INTEGER,
    reference_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add wallet balance to customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0;

-- Create payment_transactions table if not exists
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id),
    invoice_id INTEGER REFERENCES invoices(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    gateway_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update invoices table with missing fields
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT CURRENT_DATE + INTERVAL '30 days',
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('draft', 'sent', 'paid', 'overdue'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_phone_number ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff_id ON bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_staff_id ON reviews(staff_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_customer_id ON wallet_transactions(customer_id);

-- Create or update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all relevant tables
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON services 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_updated_at ON staff;
CREATE TRIGGER update_staff_updated_at 
    BEFORE UPDATE ON staff 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories if they don't exist
INSERT INTO categories (name, description, type) VALUES 
('Hair Services', 'All hair related services', 'service'),
('Skin Care', 'Facial and skin treatments', 'service'),
('Nail Care', 'Manicure and pedicure services', 'service'),
('Hair Products', 'Shampoos, conditioners, styling products', 'product'),
('Skin Products', 'Moisturizers, cleansers, treatments', 'product')
ON CONFLICT DO NOTHING;

-- Update existing services with categories if they don't have them
UPDATE services SET category = 'Hair Services' WHERE category IS NULL AND name ILIKE '%hair%';
UPDATE services SET category = 'Skin Care' WHERE category IS NULL AND name ILIKE '%facial%';
UPDATE services SET category = 'Nail Care' WHERE category IS NULL AND (name ILIKE '%manicure%' OR name ILIKE '%pedicure%');

-- Add some sample products if products table is empty
INSERT INTO products (name, description, price, cost_price, sku, category, stock_quantity) VALUES 
('Professional Shampoo', 'High-quality hair shampoo', 450, 300, 'SHMP001', 'Hair Products', 50),
('Hair Conditioner', 'Nourishing hair conditioner', 380, 250, 'COND001', 'Hair Products', 45),
('Face Moisturizer', 'Hydrating face moisturizer', 650, 400, 'MOIST001', 'Skin Products', 30),
('Hair Styling Gel', 'Strong hold styling gel', 320, 200, 'GEL001', 'Hair Products', 25)
ON CONFLICT (sku) DO NOTHING;
