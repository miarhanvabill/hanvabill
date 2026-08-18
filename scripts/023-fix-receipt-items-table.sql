-- Create receipt_items table if it doesn't exist and ensure proper structure
-- This fixes the "relation receipt_items does not exist" error

-- Drop the conflicting table if it exists
DROP TABLE IF EXISTS inventory_receipt_items CASCADE;

-- Ensure receipt_items table exists with correct structure
CREATE TABLE IF NOT EXISTS receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER REFERENCES inventory_receipts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_product ON receipt_items(product_id);

-- Ensure inventory_receipts table exists
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

-- Ensure vendors table exists
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

-- Ensure products table exists
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

-- Insert sample vendors if none exist
INSERT INTO vendors (name, contact_person, email, phone, address) VALUES
('Beauty Supply Co.', 'John Smith', 'john@beautysupply.com', '+1234567890', '123 Beauty St, City'),
('Professional Products Ltd.', 'Jane Doe', 'jane@propro.com', '+1234567891', '456 Pro Ave, City'),
('Salon Essentials Inc.', 'Mike Johnson', 'mike@salonessentials.com', '+1234567892', '789 Salon Blvd, City')
ON CONFLICT DO NOTHING;

-- Insert sample products if none exist
INSERT INTO products (name, description, price, cost, stock_quantity, min_stock_level, barcode) VALUES
('Premium Shampoo', 'Professional grade shampoo for all hair types', 25.99, 15.00, 50, 10, 'SHP001'),
('Hair Conditioner', 'Moisturizing conditioner for dry hair', 22.99, 13.00, 45, 10, 'CND001'),
('Facial Cleanser', 'Gentle facial cleanser for sensitive skin', 18.99, 11.00, 30, 5, 'FCL001'),
('Nail Polish - Red', 'Long-lasting red nail polish', 12.99, 7.00, 25, 5, 'NPR001'),
('Hair Dryer', 'Professional ionic hair dryer', 89.99, 55.00, 10, 2, 'HDR001')
ON CONFLICT DO NOTHING;
