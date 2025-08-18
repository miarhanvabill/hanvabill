-- Fix store_settings primary key sequence issue
-- This script will clean up the table and reset the sequence properly

-- First, let's see what we're working with
DO $$
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'store_settings') THEN
        RAISE NOTICE 'store_settings table exists, proceeding with cleanup...';
        
        -- Remove any duplicate setting_key entries, keeping the latest one
        DELETE FROM store_settings 
        WHERE id NOT IN (
            SELECT MAX(id) 
            FROM store_settings 
            GROUP BY setting_key
        );
        
        -- Reset the sequence to the correct value
        PERFORM setval('store_settings_id_seq', COALESCE(MAX(id), 0) + 1, false) 
        FROM store_settings;
        
        -- Ensure unique constraint exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'store_settings' 
            AND constraint_type = 'UNIQUE' 
            AND constraint_name LIKE '%setting_key%'
        ) THEN
            ALTER TABLE store_settings 
            ADD CONSTRAINT store_settings_setting_key_unique UNIQUE (setting_key);
            RAISE NOTICE 'Added unique constraint on setting_key';
        END IF;
        
        RAISE NOTICE 'store_settings table cleanup completed successfully';
    ELSE
        RAISE NOTICE 'store_settings table does not exist, will be created by application';
    END IF;
END $$;
