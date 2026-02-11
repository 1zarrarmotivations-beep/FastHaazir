
-- Add verification fields to riders table
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS cnic_front TEXT;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS cnic_back TEXT;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS license_image TEXT;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- Add check constraint for verification_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'riders_verification_status_check'
    ) THEN
        ALTER TABLE public.riders ADD CONSTRAINT riders_verification_status_check 
        CHECK (verification_status IN ('pending', 'verified', 'rejected'));
    END IF;
END $$;

-- Update RLS for riders to allow updates to their own profile during registration
CREATE POLICY "Riders can update their own data" 
ON public.riders FOR UPDATE 
USING (auth.uid() = user_id);
