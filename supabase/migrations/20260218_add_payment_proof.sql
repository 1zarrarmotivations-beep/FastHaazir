-- Add proof_url and external_transaction_id to payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS proof_url TEXT,
  ADD COLUMN IF NOT EXISTS external_transaction_id TEXT;

-- Update RLS policies if necessary (assuming admins have full access already)
-- Ensure admins can read these new columns
GRANT SELECT, UPDATE ON payments TO authenticated;
-- Allow users to upload proof (will need storage bucket policy too, but handled separately usually)
