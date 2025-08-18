-- Create customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    gender VARCHAR(20),
    sms_number VARCHAR(20),
    code VARCHAR(50),
    instagram_handle VARCHAR(100),
    lead_source VARCHAR(100),
    date_of_birth DATE,
    date_of_anniversary DATE,
    notes TEXT,
    address TEXT,
    total_visits INTEGER DEFAULT 0,
    last_visit TIMESTAMP,
    total_spent DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create staff table if it doesn't exist
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    salary INTEGER,
    specialization VARCHAR(255),
    address TEXT,
    join_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create inventory table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    sku VARCHAR(100) UNIQUE,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    supplier VARCHAR(255),
    reorder_level INTEGER DEFAULT 0,
    expiry_date DATE,
    location VARCHAR(255),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create whatsapp_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255),
    message_content TEXT NOT NULL,
    direction VARCHAR(20) NOT NULL, -- 'inbound' or 'outbound'
    status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_phone ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_created_at ON whatsapp_messages(created_at);

-- Insert some sample data if tables are empty
INSERT INTO customers (name, phone, email, gender, created_at) 
SELECT 'John Doe', '+1234567890', 'john@example.com', 'male', NOW()
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE phone = '+1234567890');

INSERT INTO staff (name, email, role, phone, salary, created_at)
SELECT 'Sarah Johnson', 'sarah@salon.com', 'manager', '+919876543220', 45000, NOW()
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'sarah@salon.com');

INSERT INTO inventory (name, category, brand, sku, quantity, unit, cost_price, selling_price, created_at)
SELECT 'Professional Shampoo', 'Hair Care', 'L''Oreal', 'SH001', 25, 'bottles', 450, 650, NOW()
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE sku = 'SH001');
