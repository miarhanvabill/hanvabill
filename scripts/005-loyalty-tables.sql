-- Create loyalty tables if they don't exist
CREATE TABLE IF NOT EXISTS customer_loyalty (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'bronze',
    lifetime_spending DECIMAL(10,2) DEFAULT 0,
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    amount DECIMAL(10,2) DEFAULT 0,
    type VARCHAR(20) NOT NULL CHECK (type IN ('earned', 'redeemed')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_customer_id ON customer_loyalty(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_id ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON loyalty_transactions(created_at);

-- Insert sample loyalty data for existing customers
INSERT INTO customer_loyalty (customer_id, points, tier, lifetime_spending, join_date, last_activity)
SELECT 
    id,
    FLOOR(RANDOM() * 1000) + 100 as points,
    CASE 
        WHEN RANDOM() > 0.8 THEN 'gold'
        WHEN RANDOM() > 0.6 THEN 'silver'
        ELSE 'bronze'
    END as tier,
    FLOOR(RANDOM() * 25000) + 1000 as lifetime_spending,
    created_at,
    CURRENT_TIMESTAMP
FROM customers 
WHERE NOT EXISTS (
    SELECT 1 FROM customer_loyalty WHERE customer_loyalty.customer_id = customers.id
);
