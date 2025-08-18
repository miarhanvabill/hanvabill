-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES categories(id),
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER NOT NULL DEFAULT 0,
    barcode VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table (hierarchical)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product categories table
CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES product_categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory receipts table
CREATE TABLE IF NOT EXISTS inventory_receipts (
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
    received_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Receipt items table
CREATE TABLE IF NOT EXISTS receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER REFERENCES inventory_receipts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory adjustments table
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('increase', 'decrease')),
    quantity INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auto consumption rules table
CREATE TABLE IF NOT EXISTS auto_consumption_rules (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id),
    product_id INTEGER REFERENCES products(id),
    quantity_per_service DECIMAL(8,2) NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff commissions table
CREATE TABLE IF NOT EXISTS staff_commissions (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id),
    service_id INTEGER REFERENCES services(id),
    commission_type VARCHAR(20) DEFAULT 'percentage', -- 'percentage', 'fixed'
    commission_value DECIMAL(8,2) NOT NULL DEFAULT 0,
    min_sale_amount DECIMAL(10,2) DEFAULT 0,
    max_commission DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff roles table
CREATE TABLE IF NOT EXISTS staff_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff goals table
CREATE TABLE IF NOT EXISTS staff_goals (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id),
    goal_type VARCHAR(50) NOT NULL, -- 'revenue', 'services', 'customers'
    target_value DECIMAL(10,2) NOT NULL,
    current_value DECIMAL(10,2) DEFAULT 0,
    period_type VARCHAR(20) DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly', 'yearly'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reward_amount DECIMAL(10,2) DEFAULT 0,
    is_achieved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff availability table
CREATE TABLE IF NOT EXISTS staff_availability (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id),
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    break_start TIME,
    break_end TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer wallets table
CREATE TABLE IF NOT EXISTS customer_wallets (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    balance DECIMAL(10,2) DEFAULT 0,
    total_credited DECIMAL(10,2) DEFAULT 0,
    total_debited DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER REFERENCES customer_wallets(id),
    transaction_type VARCHAR(20) NOT NULL, -- 'credit', 'debit'
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    reference_type VARCHAR(50), -- 'booking', 'refund', 'topup'
    reference_id INTEGER,
    balance_after DECIMAL(10,2) NOT NULL,
    created_by INTEGER REFERENCES staff(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Membership plans table
CREATE TABLE IF NOT EXISTS membership_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_months INTEGER NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    benefits JSONB DEFAULT '{}',
    max_bookings_per_month INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer memberships table
CREATE TABLE IF NOT EXISTS customer_memberships (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    plan_id INTEGER REFERENCES membership_plans(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'cancelled'
    bookings_used INTEGER DEFAULT 0,
    amount_paid DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business resources table
CREATE TABLE IF NOT EXISTS business_resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'equipment', 'room', 'tool'
    description TEXT,
    is_bookable BOOLEAN DEFAULT false,
    capacity INTEGER DEFAULT 1,
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    maintenance_schedule TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store settings table
CREATE TABLE IF NOT EXISTS store_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'text', -- 'text', 'number', 'boolean', 'json'
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mini website pages table
CREATE TABLE IF NOT EXISTS mini_website_pages (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    meta_description TEXT,
    is_published BOOLEAN DEFAULT false,
    template VARCHAR(50) DEFAULT 'default',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO categories (name, description) VALUES
('Hair Care', 'Hair care products and treatments'),
('Skin Care', 'Facial and skin care products'),
('Nail Care', 'Nail polish, treatments, and tools'),
('Tools & Equipment', 'Professional salon tools'),
('Accessories', 'Hair accessories and styling tools')
ON CONFLICT DO NOTHING;

-- Insert default vendors
INSERT INTO vendors (name, contact_person, email, phone, address) VALUES
('Beauty Supply Co.', 'John Smith', 'john@beautysupply.com', '+1234567890', '123 Beauty St, City'),
('Professional Products Ltd.', 'Jane Doe', 'jane@propro.com', '+1234567891', '456 Pro Ave, City'),
('Salon Essentials Inc.', 'Mike Johnson', 'mike@salonessentials.com', '+1234567892', '789 Salon Blvd, City')
ON CONFLICT DO NOTHING;

-- Insert default products
INSERT INTO products (name, description, category_id, price, cost, stock_quantity, min_stock_level, barcode) VALUES
('Premium Shampoo', 'Professional grade shampoo for all hair types', 1, 25.99, 15.00, 50, 10, 'SHP001'),
('Hair Conditioner', 'Moisturizing conditioner for dry hair', 1, 22.99, 13.00, 45, 10, 'CND001'),
('Facial Cleanser', 'Gentle facial cleanser for sensitive skin', 2, 18.99, 11.00, 30, 5, 'FCL001'),
('Nail Polish - Red', 'Long-lasting red nail polish', 3, 12.99, 7.00, 25, 5, 'NPR001'),
('Hair Dryer', 'Professional ionic hair dryer', 4, 89.99, 55.00, 10, 2, 'HDR001')
ON CONFLICT DO NOTHING;

-- Insert default staff roles
INSERT INTO staff_roles (name, description, permissions) VALUES
('Admin', 'Full system access', '{"all": true}'),
('Manager', 'Management access', '{"bookings": true, "customers": true, "staff": true, "reports": true}'),
('Stylist', 'Service provider', '{"bookings": true, "customers": true}'),
('Receptionist', 'Front desk operations', '{"bookings": true, "customers": true, "payments": true}')
ON CONFLICT DO NOTHING;

-- Insert default membership plans
INSERT INTO membership_plans (name, description, price, duration_months, discount_percentage, max_bookings_per_month) VALUES
('Basic', 'Basic membership with 10% discount', 99.99, 12, 10.00, 4),
('Premium', 'Premium membership with 15% discount', 199.99, 12, 15.00, 8),
('VIP', 'VIP membership with 20% discount', 299.99, 12, 20.00, 12)
ON CONFLICT DO NOTHING;

-- Insert default store settings
INSERT INTO store_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('store_name', 'My Salon', 'text', 'Store name', true),
('store_address', '123 Main St, City, State 12345', 'text', 'Store address', true),
('store_phone', '+1234567890', 'text', 'Store phone number', true),
('store_email', 'info@mysalon.com', 'text', 'Store email', true),
('business_hours', '{"monday": "9:00-18:00", "tuesday": "9:00-18:00", "wednesday": "9:00-18:00", "thursday": "9:00-18:00", "friday": "9:00-18:00", "saturday": "9:00-16:00", "sunday": "closed"}', 'json', 'Business hours', true),
('tax_rate', '8.5', 'number', 'Tax rate percentage', false),
('currency', 'USD', 'text', 'Currency code', true),
('booking_advance_days', '30', 'number', 'How many days in advance bookings can be made', false),
('cancellation_hours', '24', 'number', 'Minimum hours before cancellation', false),
('loyalty_points_rate', '1', 'number', 'Points earned per dollar spent', false)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_receipts_vendor ON inventory_receipts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_product ON receipt_items(product_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_product ON inventory_adjustments(product_id);
