-- Clean up any existing duplicate keys
DELETE FROM store_settings 
WHERE id NOT IN (
  SELECT MAX(id) 
  FROM store_settings 
  GROUP BY setting_key
);

-- Ensure the unique constraint exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'store_settings_setting_key_unique' 
    AND table_name = 'store_settings'
  ) THEN
    ALTER TABLE store_settings 
    ADD CONSTRAINT store_settings_setting_key_unique UNIQUE (setting_key);
  END IF;
END $$;

-- Reset the sequence to prevent primary key conflicts
SELECT setval('store_settings_id_seq', COALESCE(MAX(id), 0) + 1, false) 
FROM store_settings;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_store_settings_key ON store_settings(setting_key);
