-- Create loyalty settings table
CREATE TABLE IF NOT EXISTS loyalty_settings (
    id SERIAL PRIMARY KEY,
    points_per_rupee DECIMAL(10,2) DEFAULT 1.0,
    cashback_percentage DECIMAL(5,2) DEFAULT 5.0,
    minimum_order_amount INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    welcome_bonus INTEGER DEFAULT 100,
    referral_bonus INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create loyalty transactions table
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('earned', 'redeemed')),
    points INTEGER DEFAULT 0,
    amount DECIMAL(10,2) DEFAULT 0,
    description TEXT,
    order_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create gift cards table
CREATE TABLE IF NOT EXISTS gift_cards (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    category_id INTEGER REFERENCES product_categories(id),
    vendor_id INTEGER REFERENCES vendors(id),
    cost_price DECIMAL(10,2) DEFAULT 0,
    selling_price DECIMAL(10,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create product categories table
CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES product_categories(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create inventory receipts table
CREATE TABLE IF NOT EXISTS inventory_receipts (
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id),
    total_amount DECIMAL(10,2) DEFAULT 0,
    received_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'received' CHECK (status IN ('pending', 'received', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create inventory receipt items table
CREATE TABLE IF NOT EXISTS inventory_receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER REFERENCES inventory_receipts(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create inventory adjustments table
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    adjustment_type VARCHAR(20) CHECK (adjustment_type IN ('increase', 'decrease')),
    quantity INTEGER NOT NULL,
    reason VARCHAR(255),
    notes TEXT,
    adjusted_by INTEGER, -- staff member id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create membership plans table
CREATE TABLE IF NOT EXISTS membership_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_months INTEGER NOT NULL,
    benefits TEXT,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customer memberships table
CREATE TABLE IF NOT EXISTS customer_memberships (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    membership_plan_id INTEGER REFERENCES membership_plans(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default loyalty settings
INSERT INTO loyalty_settings (points_per_rupee, cashback_percentage, minimum_order_amount, is_active, welcome_bonus, referral_bonus)
VALUES (1.0, 5.0, 100, true, 100, 50)
ON CONFLICT DO NOTHING;

-- Insert sample product categories
INSERT INTO product_categories (name, description) VALUES
('Hair Care', 'Hair care products and treatments'),
('Skin Care', 'Skin care products and treatments'),
('Nail Care', 'Nail care products and treatments'),
('Makeup', 'Makeup and cosmetic products'),
('Tools & Equipment', 'Salon tools and equipment')
ON CONFLICT DO NOTHING;
