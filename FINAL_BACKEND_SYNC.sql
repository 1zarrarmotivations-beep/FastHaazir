
-- ==========================================================
-- 🚀 ULTIMATE BACKEND REPAIR SCRIPT 🚀
-- Fast Haazir - Full Production Synchronization
-- ==========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_type') THEN
        CREATE TYPE public.business_type AS ENUM ('restaurant', 'bakery', 'grocery', 'shop', 'pharmacy');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM ('placed', 'preparing', 'on_way', 'delivered', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'business', 'rider', 'customer');
    END IF;
END $$;

-- 3. CORE TABLES SYNC (Adding every possible missing column)

-- Admins
ALTER TABLE IF EXISTS public.admins 
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_super BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Businesses
ALTER TABLE IF EXISTS public.businesses 
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS type business_type DEFAULT 'restaurant',
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS owner_phone TEXT,
  ADD COLUMN IF NOT EXISTS owner_email TEXT,
  ADD COLUMN IF NOT EXISTS location_address TEXT,
  ADD COLUMN IF NOT EXISTS location_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS location_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 4.5,
  ADD COLUMN IF NOT EXISTS eta TEXT DEFAULT '20-30 min',
  ADD COLUMN IF NOT EXISTS distance TEXT DEFAULT '1.0 km',
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 15,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ridres
ALTER TABLE IF EXISTS public.riders 
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'Bike',
  ADD COLUMN IF NOT EXISTS cnic TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Quetta',
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 10,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'verified', -- Default to verified to make it easy for user
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Orders
ALTER TABLE IF EXISTS public.orders 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES public.riders(id),
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id),
  ADD COLUMN IF NOT EXISTS status order_status DEFAULT 'placed',
  ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS delivery_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Rider Requests (Pick/Drop)
ALTER TABLE IF EXISTS public.rider_requests 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES public.riders(id),
  ADD COLUMN IF NOT EXISTS status order_status DEFAULT 'placed',
  ADD COLUMN IF NOT EXISTS item_description TEXT,
  ADD COLUMN IF NOT EXISTS item_image TEXT,
  ADD COLUMN IF NOT EXISTS pickup_address TEXT,
  ADD COLUMN IF NOT EXISTS pickup_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS pickup_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS dropoff_address TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS dropoff_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Menu Items
ALTER TABLE IF EXISTS public.menu_items 
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Item',
  ADD COLUMN IF NOT EXISTS price NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 4. VIEWS SYNC
DROP VIEW IF EXISTS public.public_businesses CASCADE;
CREATE OR REPLACE VIEW public.public_businesses AS
SELECT id, name, type, image, rating, eta, distance, category, description, featured, is_active, is_approved, updated_at, created_at, deleted_at, location_address, location_lat, location_lng
FROM public.businesses
WHERE deleted_at IS NULL AND is_active = true AND is_approved = true;

GRANT SELECT ON public.public_businesses TO anon, authenticated;

-- 5. FUNCTIONS & TRIGGERS

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  ) OR EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = _user_id AND is_active = true
  );
$$;

-- resolve_role_by_email
CREATE OR REPLACE FUNCTION public.resolve_role_by_email(_email text)
RETURNS TABLE(role text, is_blocked boolean) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _is_active boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  -- 1) Admin
  SELECT a.user_id, a.is_active INTO _id, _is_active FROM public.admins a WHERE lower(a.email) = lower(_email) LIMIT 1;
  IF FOUND THEN
    UPDATE public.admins SET user_id = _uid, updated_at = now() WHERE lower(email) = lower(_email);
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
    RETURN QUERY SELECT 'admin'::text, NOT _is_active; RETURN;
  END IF;

  -- 2) Rider
  SELECT r.user_id, r.is_active INTO _id, _is_active FROM public.riders r WHERE lower(r.email) = lower(_email) LIMIT 1;
  IF FOUND THEN
    UPDATE public.riders SET user_id = _uid, updated_at = now() WHERE lower(email) = lower(_email);
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'rider'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
    RETURN QUERY SELECT 'rider'::text, NOT _is_active; RETURN;
  END IF;

  -- 3) Customer
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'customer'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
  RETURN QUERY SELECT 'customer'::text, false;
END;
$$;

-- Automatic Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.customer_profiles (user_id, name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. SECURITY BRUTE FORCE (Give Admin absolute power)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admin full access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Admin full access" ON public.%I FOR ALL USING (public.has_role(auth.uid(), ''admin''))', t);
  END LOOP;
END $$;

-- 7. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- 8. FINAL LINKING
-- Ensure your current admin account is linked
UPDATE public.admins SET user_id = 'c125d03a-3d92-411a-8c87-8d052737609a' WHERE phone = '+923110111419' OR lower(email) = 'babajaanz451@gmail.com';
INSERT INTO public.user_roles (user_id, role) VALUES ('c125d03a-3d92-411a-8c87-8d052737609a', 'admin'::app_role) ON CONFLICT DO NOTHING;

-- Final output
SELECT '✅ MISSION COMPLETE: Backend fully synchronized and repaired.' as status;
