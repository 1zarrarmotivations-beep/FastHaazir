
-- 1. PROFILES TABLE & RLS
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  phone text,
  role text DEFAULT 'customer',
  full_name text,
  avatar_url text,
  phone_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin Policy
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ) OR 
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND is_active = true
    )
  );


-- 2. CUSTOMER PROFILES SYNC (Ensure existence)
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name text,
  email text,
  phone text,
  address text,
  phone_verified boolean DEFAULT false,
  profile_image text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own customer profile" ON public.customer_profiles;
CREATE POLICY "Users can manage own customer profile" ON public.customer_profiles
  FOR ALL USING (auth.uid() = user_id);


-- 3. WALLET TABLE
CREATE TABLE IF NOT EXISTS public.rider_wallets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  rider_id uuid REFERENCES public.riders(id) ON DELETE CASCADE,
  balance numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_rider_wallet UNIQUE (rider_id)
);

ALTER TABLE public.rider_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Riders can view own wallet" ON public.rider_wallets;
CREATE POLICY "Riders can view own wallet" ON public.rider_wallets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all wallets" ON public.rider_wallets;
CREATE POLICY "Admins can manage all wallets" ON public.rider_wallets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ) OR 
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND is_active = true
    )
  );


-- 4. RESOLVE ROLE FUNCTIONS (Synced)

CREATE OR REPLACE FUNCTION public.resolve_role_by_email(_email text)
RETURNS TABLE(role text, is_blocked boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _role text := 'customer';
  _is_active boolean := true;
  _name text;
  _phone text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  -- Check Admin
  SELECT user_id, is_active, name, phone INTO _uid, _is_active, _name, _phone 
  FROM public.admins WHERE lower(email) = lower(_email) LIMIT 1;
  
  IF FOUND THEN
    _role := 'admin';
    UPDATE public.admins SET user_id = auth.uid() WHERE lower(email) = lower(_email);
  END IF;

  -- Check Rider
  IF _role = 'customer' THEN
    SELECT user_id, is_active, name, phone INTO _uid, _is_active, _name, _phone
    FROM public.riders WHERE lower(email) = lower(_email) LIMIT 1;
    
    IF FOUND THEN
      _role := 'rider';
      UPDATE public.riders SET user_id = auth.uid() WHERE lower(email) = lower(_email);
    END IF;
  END IF;

  -- Upsert Profile
  INSERT INTO public.profiles (id, email, role, full_name, phone, updated_at)
  VALUES (auth.uid(), _email, _role, _name, _phone, now())
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email, 
    role = EXCLUDED.role, 
    updated_at = now(),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone);

  -- Upsert Customer Profile (Sync)
  INSERT INTO public.customer_profiles (user_id, email, name, phone, updated_at)
  VALUES (auth.uid(), _email, _name, _phone, now())
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(public.customer_profiles.name, EXCLUDED.name),
    phone = COALESCE(public.customer_profiles.phone, EXCLUDED.phone),
    updated_at = now();

  -- Sync user_roles
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN QUERY SELECT _role, (NOT _is_active);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_role_by_phone(_phone text)
RETURNS TABLE(role text, is_blocked boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _role text := 'customer';
  _formatted_phone text := _phone;
  _is_active boolean := true;
  _name text;
  _email text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  -- Check Rider
  SELECT user_id, is_active, name, email INTO _uid, _is_active, _name, _email
  FROM public.riders WHERE phone = _formatted_phone LIMIT 1;

  IF FOUND THEN
    _role := 'rider';
    UPDATE public.riders SET user_id = auth.uid() WHERE phone = _formatted_phone;
  END IF;

  -- Upsert Profile (Mark verified)
  INSERT INTO public.profiles (id, phone, role, full_name, email, phone_verified, updated_at)
  VALUES (auth.uid(), _formatted_phone, _role, _name, _email, true, now())
  ON CONFLICT (id) DO UPDATE
  SET 
    phone = EXCLUDED.phone, 
    role = EXCLUDED.role, 
    phone_verified = true,
    updated_at = now(),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    email = COALESCE(public.profiles.email, EXCLUDED.email);

  -- Upsert Customer Profile (Sync & Mark Verified)
  INSERT INTO public.customer_profiles (user_id, phone, name, email, phone_verified, updated_at)
  VALUES (auth.uid(), _formatted_phone, _name, _email, true, now())
  ON CONFLICT (user_id) DO UPDATE
  SET
    phone = EXCLUDED.phone,
    phone_verified = true,
    name = COALESCE(public.customer_profiles.name, EXCLUDED.name),
    email = COALESCE(public.customer_profiles.email, EXCLUDED.email),
    updated_at = now();

  -- Sync user_roles
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN QUERY SELECT _role, (NOT _is_active);
END;
$$;
