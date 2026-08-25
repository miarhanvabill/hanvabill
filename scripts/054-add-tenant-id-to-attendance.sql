-- Add tenant_id to attendance if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='tenant_id') THEN
    ALTER TABLE attendance ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
    -- Set a default tenant if you have data
    UPDATE attendance SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;
    ALTER TABLE attendance ALTER COLUMN tenant_id SET NOT NULL;
    
    -- Drop old unique constraint
    ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_staff_id_date_key;
    -- Add new tenant-aware unique constraint
    ALTER TABLE attendance ADD CONSTRAINT attendance_tenant_id_staff_id_date_key UNIQUE (tenant_id, staff_id, date);
  END IF;
END $$;
