-- Migration: Add tenant_id to coupons table (if not already present)
-- This ensures coupons are properly scoped per tenant

DO $$
BEGIN
  -- Add tenant_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE coupons ADD COLUMN tenant_id VARCHAR(255);

    -- Backfill existing rows with a default tenant_id if any exist
    UPDATE coupons SET tenant_id = 'default' WHERE tenant_id IS NULL;

    -- Make it NOT NULL after backfill
    ALTER TABLE coupons ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  -- Add unique constraint on (tenant_id, code) replacing old global unique on code
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'coupons_tenant_id_code_key'
  ) THEN
    -- Drop the old global unique constraint on code if present
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'coupons_code_key'
    ) THEN
      ALTER TABLE coupons DROP CONSTRAINT coupons_code_key;
    END IF;

    ALTER TABLE coupons ADD CONSTRAINT coupons_tenant_id_code_key UNIQUE (tenant_id, code);
  END IF;

  -- Add index on tenant_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'coupons' AND indexname = 'idx_coupons_tenant_id'
  ) THEN
    CREATE INDEX idx_coupons_tenant_id ON coupons(tenant_id);
  END IF;
END
$$;
