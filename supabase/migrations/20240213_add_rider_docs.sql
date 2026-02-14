-- Add document image columns to riders table
ALTER TABLE public.riders 
ADD COLUMN IF NOT EXISTS cnic_front TEXT,
ADD COLUMN IF NOT EXISTS cnic_back TEXT,
ADD COLUMN IF NOT EXISTS license_image TEXT;

-- Verify RLS policies on riders table for admin access
-- Ensure admins can INSERT into riders table if needed (though create-user bypasses RLS on backend)
-- But for frontend read access, admin policy should be correct.
