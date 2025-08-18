-- Fix database schema issues causing console errors

-- Fix amount_paid column type from TEXT to NUMERIC
ALTER TABLE customer_memberships 
ALTER COLUMN amount_paid TYPE NUMERIC USING amount_paid::NUMERIC;

-- Add missing columns that queries are expecting
ALTER TABLE customer_memberships 
ADD COLUMN IF NOT EXISTS bookings_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bookings_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS usage_percentage NUMERIC DEFAULT 0;

-- Add indexes to improve query performance and reduce timeouts
CREATE INDEX IF NOT EXISTS idx_customer_memberships_customer_id ON customer_memberships(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_status ON customer_memberships(status);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_plan_id ON customer_memberships(membership_plan_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_id ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON loyalty_transactions(created_at);

-- Update existing records to have proper default values
UPDATE customer_memberships 
SET 
  bookings_used = 0,
  bookings_remaining = 8,
  usage_percentage = 0
WHERE bookings_used IS NULL;
