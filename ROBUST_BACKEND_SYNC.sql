
-- 1. CREATE ENUMS FIRST (Avoid "type does not exist" errors)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'business', 'rider', 'customer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_type') THEN
        CREATE TYPE public.business_type AS ENUM ('restaurant', 'bakery', 'grocery', 'shop', 'pharmacy');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM ('placed', 'preparing', 'on_way', 'delivered', 'cancelled');
    END IF;
END $$;

-- 2. FIX TABLE TYPES (Using TEXT for maximum safety/flexibility in functions)
-- We will keep user_roles.role as TEXT to avoid casting issues in functions.
ALTER TABLE IF EXISTS public.user_roles ALTER COLUMN role TYPE TEXT;

-- 3. REPAIR "has_role" FUNCTION (Robust version using TEXT comparison)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role::text = _role::text
  ) OR EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = _user_id AND is_active = true
  );
$$;

-- Overload for ENUM if something still uses it
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, _role::text);
$$;

-- 4. REPAIR "resolve_role_by_email"
CREATE OR REPLACE FUNCTION public.resolve_role_by_email(_email text)
RETURNS TABLE(role text, is_blocked boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
    RETURN QUERY SELECT 'admin'::text, NOT _is_active; RETURN;
  END IF;

  -- 2) Rider
  SELECT r.user_id, r.is_active INTO _id, _is_active FROM public.riders r WHERE lower(r.email) = lower(_email) LIMIT 1;
  IF FOUND THEN
    UPDATE public.riders SET user_id = _uid, updated_at = now() WHERE lower(email) = lower(_email);
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'rider') ON CONFLICT (user_id, role) DO NOTHING;
    RETURN QUERY SELECT 'rider'::text, NOT _is_active; RETURN;
  END IF;

  -- 3) Customer
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'customer') ON CONFLICT (user_id, role) DO NOTHING;
  RETURN QUERY SELECT 'customer'::text, false;
END;
$$;

-- 5. REFRESH LIVE VIEW
DROP VIEW IF EXISTS public.public_businesses CASCADE;
CREATE OR REPLACE VIEW public.public_businesses AS
SELECT id, name, type, image, rating, eta, distance, category, description, featured, is_active, is_approved, updated_at, created_at, deleted_at, location_address, location_lat, location_lng
FROM public.businesses
WHERE (deleted_at IS NULL OR deleted_at > now()) AND is_active = true AND is_approved = true;

GRANT SELECT ON public.public_businesses TO anon, authenticated;

-- 6. RELOAD EVERYTHING
NOTIFY pgrst, 'reload schema';

SELECT '✅ BACKEND REPAIRED SUCCESSFULLY' as status;
