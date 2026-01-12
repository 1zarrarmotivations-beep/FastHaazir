-- Add owner fields to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS owner_phone text,
ADD COLUMN IF NOT EXISTS owner_user_id uuid;

-- Add 'business' to app_role enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'business' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'business';
  END IF;
END$$;

-- Function to link user to rider/business on login and assign role
CREATE OR REPLACE FUNCTION public.link_user_on_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phone_clean text;
  rider_record RECORD;
  business_record RECORD;
BEGIN
  -- Clean phone number (remove + and leading zeros, keep only digits)
  phone_clean := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
  
  -- Check if phone ends with the local number (last 10 digits)
  -- First check riders table
  SELECT id INTO rider_record 
  FROM public.riders 
  WHERE regexp_replace(phone, '[^0-9]', '', 'g') LIKE '%' || right(phone_clean, 10)
    AND user_id IS NULL
  LIMIT 1;
  
  IF FOUND THEN
    -- Link user to rider
    UPDATE public.riders SET user_id = NEW.id WHERE id = rider_record.id;
    
    -- Assign rider role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'rider')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
  END IF;
  
  -- Check businesses table
  SELECT id INTO business_record 
  FROM public.businesses 
  WHERE regexp_replace(owner_phone, '[^0-9]', '', 'g') LIKE '%' || right(phone_clean, 10)
    AND owner_user_id IS NULL
  LIMIT 1;
  
  IF FOUND THEN
    -- Link user to business
    UPDATE public.businesses SET owner_user_id = NEW.id WHERE id = business_record.id;
    
    -- Assign business role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'business')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_user_login_link ON auth.users;
CREATE TRIGGER on_user_login_link
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_user_on_login();

-- RLS policy for businesses - business owners can manage their own business
CREATE POLICY "Business owners can update their business" 
ON public.businesses 
FOR UPDATE 
USING (owner_user_id = auth.uid());

CREATE POLICY "Business owners can view their business" 
ON public.businesses 
FOR SELECT 
USING (owner_user_id = auth.uid());

-- Allow business owners to manage their menu items
CREATE POLICY "Business owners can manage their menu items" 
ON public.menu_items 
FOR ALL 
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()
  )
);

-- Add commission fields to riders and businesses
ALTER TABLE public.riders 
ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 10;

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 15;