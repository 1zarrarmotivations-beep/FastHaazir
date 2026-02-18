-- Create app_role enum
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'rider', 'customer', 'business');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    role app_role NOT NULL DEFAULT 'customer',
    full_name TEXT,
    email TEXT,
    phone TEXT,
    is_blocked BOOLEAN DEFAULT false,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT profiles_user_id_key UNIQUE (user_id)
);

-- Create unique indexes for email and phone
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_idx ON public.profiles (phone) WHERE phone IS NOT NULL;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
-- Admins can do everything
CREATE POLICY "Admins can do everything on profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Allow new users to check if they have a profile (for signup flow) - handled by SECURITY DEFINER functions usually, but helpful for RLS
-- Actually, get_my_role is SECURITY DEFINER so it bypasses RLS.

-- Create rider_applications table
CREATE TABLE IF NOT EXISTS public.rider_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Link to profiles, not auth.users directly? Or both? Linking to profiles is safer for pre-signup applications? No, user must exist to apply.
    -- Wait, simpler: user_id references profiles(id)
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    vehicle_type TEXT,
    experience_years INTEGER,
    license_number TEXT,
    notes TEXT,
    approved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for rider_applications
ALTER TABLE public.rider_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications" ON public.rider_applications FOR SELECT USING (
    exists (select 1 from public.profiles where id = rider_applications.user_id and user_id = auth.uid())
);
CREATE POLICY "Users can insert own applications" ON public.rider_applications FOR INSERT WITH CHECK (
    exists (select 1 from public.profiles where id = rider_applications.user_id and user_id = auth.uid())
);
CREATE POLICY "Admins view all applications" ON public.rider_applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins update applications" ON public.rider_applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);


-- DATA MIGRATION SECTION
-- 1. Migrate Admins
INSERT INTO public.profiles (user_id, role, email, phone, is_blocked, created_at)
SELECT 
    user_id, 
    'admin'::app_role, 
    email, 
    phone, 
    NOT COALESCE(is_active, true), 
    created_at
FROM public.admins
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- 2. Migrate Riders
-- Note: Riders might not look up to profiles yet, assuming profiles created by admin
-- But for existing riders, we insert them.
INSERT INTO public.profiles (user_id, role, email, phone, is_blocked, full_name, created_at)
SELECT 
    r.user_id, 
    'rider'::app_role, 
    r.email, 
    r.phone, 
    NOT COALESCE(r.is_active, true), 
    r.name,
    r.created_at
FROM public.riders r
where r.user_id is not null
ON CONFLICT (user_id) DO NOTHING; -- Priority to Admin if user is both (unlikely)

-- 3. Migrate Customers (from customer_profiles)
INSERT INTO public.profiles (user_id, role, email, phone, full_name, created_at)
SELECT 
    user_id, 
    'customer'::app_role, 
    email, 
    phone, 
    name,
    created_at
FROM public.customer_profiles
ON CONFLICT (user_id) DO NOTHING;

-- 4. Migrate remaining from user_roles + auth.users
INSERT INTO public.profiles (user_id, role, email, phone, created_at)
SELECT 
    ur.user_id, 
    ur.role::app_role, 
    u.email, 
    u.phone,
    ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
ON CONFLICT (user_id) DO NOTHING;

-- 5. Catch-all for any users in auth.users not in profiles (default customer)
INSERT INTO public.profiles (user_id, role, email, phone, created_at)
SELECT 
    id, 
    'customer'::app_role, 
    email, 
    phone,
    created_at
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;


-- NOW: Rewrite get_my_role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TABLE (
  role text,
  is_blocked boolean,
  needs_registration boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _uid uuid := auth.uid();
  _profile public.profiles%ROWTYPE;
  _rider_status text;
BEGIN
  IF _uid IS NULL THEN
    RETURN QUERY SELECT 'customer'::text, false, false;
    RETURN;
  END IF;

  -- Get profile
  SELECT * INTO _profile FROM public.profiles WHERE user_id = _uid;

  IF NOT FOUND THEN
    -- Fallback: Create profile if missing (should be handled by trigger, but for safety)
    RETURN QUERY SELECT 'customer'::text, false, false;
    RETURN;
  END IF;

  -- Logic for Rider Registration
  -- If role is rider, check if they are verified in riders table
  -- Note: existing system uses 'riders' table for rider stats/info.
  -- We should KEEP riders table for connection to orders, but use profiles for auth.
  
  IF _profile.role = 'rider' THEN
    SELECT verification_status INTO _rider_status FROM public.riders WHERE user_id = _uid;
    
    IF _rider_status IS NULL OR _rider_status != 'verified' THEN
       RETURN QUERY SELECT 'rider'::text, _profile.is_blocked, true; -- Needs registration/verification
       RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT _profile.role::text, _profile.is_blocked, false;
END;
$$;


-- TRIGGER for New Users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  match_id uuid;
BEGIN
  -- Check if profile exists with same phone or email (created by admin)
  SELECT id INTO match_id FROM public.profiles 
  WHERE (email = NEW.email AND email IS NOT NULL) 
     OR (phone = NEW.phone AND phone IS NOT NULL)
  LIMIT 1;

  IF match_id IS NOT NULL THEN
     -- Update existing profile
     UPDATE public.profiles 
     SET user_id = NEW.id, 
         email = COALESCE(email, NEW.email),
         updated_at = now()
     WHERE id = match_id;
  ELSE
     -- Create new profile
     INSERT INTO public.profiles (user_id, role, email, phone, full_name)
     VALUES (
       NEW.id,
       'customer', -- Default role
       NEW.email,
       NEW.phone,
       NEW.raw_user_meta_data->>'full_name'
     );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Function to allow ADMIN to add a rider (pre-create profile)
CREATE OR REPLACE FUNCTION public.admin_create_rider_profile(
  _phone text,
  _name text,
  _email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _new_id uuid;
  _current_role app_role;
BEGIN
  -- Check if caller is admin
  SELECT role INTO _current_role FROM public.profiles WHERE user_id = auth.uid();
  IF _current_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.profiles (role, phone, full_name, email)
  VALUES ('rider', _phone, _name, _email)
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

