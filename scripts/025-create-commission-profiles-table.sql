-- Create commission profiles table for managing staff commission structures
CREATE TABLE IF NOT EXISTS commission_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('percentage', 'fixed', 'tiered')),
    base_rate NUMERIC(10,2) DEFAULT 0,
    min_threshold NUMERIC(10,2) DEFAULT 0,
    max_threshold NUMERIC(10,2) DEFAULT 0,
    applies_to VARCHAR(20) NOT NULL CHECK (applies_to IN ('services', 'products', 'both')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create commission tiers table for tiered commission structures
CREATE TABLE IF NOT EXISTS commission_tiers (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER REFERENCES commission_profiles(id) ON DELETE CASCADE,
    min_amount NUMERIC(10,2) NOT NULL,
    max_amount NUMERIC(10,2) NOT NULL,
    rate NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add commission_profile_id to staff table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'commission_profile_id') THEN
        ALTER TABLE staff ADD COLUMN commission_profile_id INTEGER REFERENCES commission_profiles(id);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_commission_profiles_active ON commission_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_commission_tiers_profile_id ON commission_tiers(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_commission_profile_id ON staff(commission_profile_id);

-- Insert some default commission profiles
INSERT INTO commission_profiles (name, description, commission_type, base_rate, applies_to, is_active) VALUES
('Standard Service Commission', 'Standard commission for all services', 'percentage', 15.00, 'services', true),
('Product Sales Commission', 'Commission for product sales', 'percentage', 10.00, 'products', true),
('Senior Stylist Commission', 'Higher commission for senior stylists', 'percentage', 20.00, 'both', true)
ON CONFLICT DO NOTHING;

-- Add update trigger for commission_profiles
CREATE OR REPLACE FUNCTION update_commission_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_commission_profiles_updated_at ON commission_profiles;
CREATE TRIGGER trigger_update_commission_profiles_updated_at
    BEFORE UPDATE ON commission_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_commission_profiles_updated_at();
