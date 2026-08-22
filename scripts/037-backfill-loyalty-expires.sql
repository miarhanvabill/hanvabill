-- Backfill expires_at for existing earned loyalty points if missing
UPDATE loyalty_transactions
SET expires_at = created_at + INTERVAL '45 days'
WHERE transaction_type = 'earned' 
  AND expires_at IS NULL;
