-- Migration 064: Add missing staff columns that are referenced in production queries
-- These columns were added by the 10-agent audit but migration was not run against production DB

-- Add department column to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Add shift_start and shift_end columns to staff table  
ALTER TABLE staff ADD COLUMN IF NOT EXISTS shift_start TIME;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS shift_end TIME;

-- Add avatar_url if not exists (script 038 should have done this, but safeguard)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add commission_profile_id if not exists (script 025 should have done this, but safeguard)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS commission_profile_id INTEGER;

-- Ensure staff_availability has all required columns
ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS break_start TIME;
ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS break_end TIME;
ALTER TABLE staff_availability ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- Add index for tenant-scoped availability queries
CREATE INDEX IF NOT EXISTS idx_staff_availability_tenant ON staff_availability(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_availability_staff_day ON staff_availability(staff_id, day_of_week);

-- Ensure bookings has resource_id column (used in calendar queries)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS resource_id INTEGER;

-- Ensure booking_services table has tenant_id (used in availability calculation)
ALTER TABLE booking_services ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
