-- Add unique constraint to setting_key column in store_settings table
ALTER TABLE store_settings ADD CONSTRAINT unique_setting_key UNIQUE (setting_key);

-- Remove any duplicate entries first (keep the most recent one)
DELETE FROM store_settings s1 
USING store_settings s2 
WHERE s1.id < s2.id 
AND s1.setting_key = s2.setting_key;
