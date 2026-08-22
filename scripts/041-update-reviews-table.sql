-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    customer_id INTEGER,
    booking_id INTEGER,
    rating INTEGER NOT NULL,
    review_text TEXT,
    platform VARCHAR(50) DEFAULT 'Direct',
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add owner_reply column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='reviews' AND column_name='owner_reply') THEN
        ALTER TABLE reviews ADD COLUMN owner_reply TEXT;
    END IF;
END $$;
