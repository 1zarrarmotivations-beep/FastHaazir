-- Add phone_verified column to customer_profiles
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;

-- Create index for phone lookup
CREATE INDEX IF NOT EXISTS idx_customer_profiles_phone ON public.customer_profiles(phone) WHERE phone IS NOT NULL;