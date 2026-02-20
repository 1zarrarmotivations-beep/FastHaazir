ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
