-- Migration 046: Add missing columns to loyalty_transactions and customers
-- Adds tenant_id, type, expires_at to loyalty_transactions
-- Adds loyalty_enrolled to customers

DO $$ BEGIN
  -- loyalty_transactions: tenant_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_transactions' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE loyalty_transactions ADD COLUMN tenant_id TEXT;
  END IF;

  -- loyalty_transactions: type (bonus/refund distinction)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_transactions' AND column_name = 'type'
  ) THEN
    ALTER TABLE loyalty_transactions ADD COLUMN type VARCHAR(20) DEFAULT 'earned';
  END IF;

  -- loyalty_transactions: expires_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_transactions' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE loyalty_transactions ADD COLUMN expires_at TIMESTAMP;
  END IF;

  -- customers: loyalty_enrolled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'loyalty_enrolled'
  ) THEN
    ALTER TABLE customers ADD COLUMN loyalty_enrolled BOOLEAN DEFAULT true;
  END IF;
END $$;
