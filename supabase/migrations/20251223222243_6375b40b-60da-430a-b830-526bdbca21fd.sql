-- 1. Drop the trigger first (it's on auth.users with a different name)
DROP TRIGGER IF EXISTS on_user_login_link ON auth.users;

-- 2. Now drop the vulnerable function
DROP FUNCTION IF EXISTS public.link_user_on_login();

-- 3. Create a secure public view for businesses (without owner_phone)
CREATE OR REPLACE VIEW public.public_business_info AS
SELECT 
  id,
  name,
  type,
  image,
  rating,
  eta,
  distance,
  category,
  description,
  featured,
  is_active
FROM public.businesses
WHERE is_active = true;

-- 4. Update businesses RLS - restrict public access to not show owner_phone
DROP POLICY IF EXISTS "Businesses are viewable by everyone" ON public.businesses;

-- Authenticated users can view active businesses
CREATE POLICY "Authenticated users can view active businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (is_active = true);

-- 5. Add claimed flags to prevent future abuse
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS claimed BOOLEAN DEFAULT false;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS claimed BOOLEAN DEFAULT false;

-- 6. Mark existing linked accounts as claimed
UPDATE public.riders SET claimed = true WHERE user_id IS NOT NULL;
UPDATE public.businesses SET claimed = true WHERE owner_user_id IS NOT NULL;