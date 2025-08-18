-- Update customers table to include all required columns
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS date_of_anniversary DATE,
ADD COLUMN IF NOT EXISTS sms_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(100),
ADD COLUMN IF NOT EXISTS lead_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Update existing records to have proper timestamps if they don't exist
UPDATE customers 
SET created_at = NOW() 
WHERE created_at IS NULL;

UPDATE customers 
SET updated_at = NOW() 
WHERE updated_at IS NULL;
