-- Migration: add tenant_id and notes columns to staff_availability table
-- This brings the table in line with multi-tenant architecture used throughout the app.

-- 1. Add tenant_id column (nullable first so existing rows don't fail)
ALTER TABLE staff_availability
  ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- 2. Add notes column if it doesn't exist (009 script omitted it)
ALTER TABLE staff_availability
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Add UNIQUE constraint on (staff_id, day_of_week) if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_availability_staff_id_day_of_week_key'
  ) THEN
    ALTER TABLE staff_availability
      ADD CONSTRAINT staff_availability_staff_id_day_of_week_key
      UNIQUE (staff_id, day_of_week);
  END IF;
END $$;

-- 4. Back-fill tenant_id from the related staff row for existing records
UPDATE staff_availability sa
SET tenant_id = s.tenant_id
FROM staff s
WHERE sa.staff_id = s.id
  AND sa.tenant_id IS NULL;

-- 5. Create index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_staff_availability_tenant_id
  ON staff_availability (tenant_id);

-- 6. Create composite index for common lookup pattern
CREATE INDEX IF NOT EXISTS idx_staff_availability_tenant_staff
  ON staff_availability (tenant_id, staff_id);

-- Verify
SELECT COUNT(*) AS total_records, COUNT(tenant_id) AS records_with_tenant
FROM staff_availability;
