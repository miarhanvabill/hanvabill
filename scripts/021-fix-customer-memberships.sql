-- Create script to fix customer memberships data integrity

-- Update the customer_memberships table structure if needed
ALTER TABLE customer_memberships 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Fix any orphaned memberships by setting them to cancelled
UPDATE customer_memberships 
SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
WHERE customer_id NOT IN (SELECT id FROM customers)
   OR membership_plan_id NOT IN (SELECT id FROM membership_plans);

-- Update expired memberships that are still marked as active
UPDATE customer_memberships 
SET status = 'expired', updated_at = CURRENT_TIMESTAMP
WHERE status = 'active' AND end_date < CURRENT_DATE;

-- Ensure all active memberships have valid dates
UPDATE customer_memberships 
SET end_date = start_date + INTERVAL '12 months', updated_at = CURRENT_TIMESTAMP
WHERE status = 'active' AND (end_date IS NULL OR end_date <= start_date);

-- Add some sample customer memberships if the table is empty
INSERT INTO customer_memberships (customer_id, membership_plan_id, start_date, end_date, status, amount_paid, bookings_used)
SELECT 
    c.id as customer_id,
    mp.id as membership_plan_id,
    CURRENT_DATE as start_date,
    CURRENT_DATE + INTERVAL '12 months' as end_date,
    'active' as status,
    mp.price as amount_paid,
    FLOOR(RANDOM() * 5) as bookings_used
FROM customers c
CROSS JOIN membership_plans mp
WHERE mp.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM customer_memberships cm 
    WHERE cm.customer_id = c.id AND cm.status = 'active'
  )
LIMIT 10; -- Only add a few sample memberships

-- Create or update indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_memberships_dates ON customer_memberships(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_active ON customer_memberships(status, end_date) WHERE status = 'active';
