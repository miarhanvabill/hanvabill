-- Migration: Widen whatsapp_messages status check constraint to include 'received' and 'pending'
-- This fixes the constraint violation when saving inbound messages

DO $$ BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'whatsapp_messages' 
    AND constraint_name = 'whatsapp_messages_status_check'
  ) THEN
    ALTER TABLE whatsapp_messages DROP CONSTRAINT whatsapp_messages_status_check;
  END IF;

  -- Add new wider constraint that includes inbound statuses
  ALTER TABLE whatsapp_messages 
    ADD CONSTRAINT whatsapp_messages_status_check 
    CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'received', 'pending'));

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update whatsapp_messages_status_check: %', SQLERRM;
END $$;
