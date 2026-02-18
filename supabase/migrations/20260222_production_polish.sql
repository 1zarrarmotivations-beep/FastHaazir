-- ============================================================================
-- PRODUCTION RBAC FINAL POLISH
-- Date: 2026-02-22
-- ============================================================================

-- 1. CLEANUP DUPLICATE PROFILES (If any)
-- Ensure only the most recently updated profile remains per user_id
DELETE FROM public.profiles p1
USING public.profiles p2
WHERE p1.user_id = p2.user_id 
  AND p1.id < p2.id;

-- 2. ENSURE PROFILES TABLE CONSTRAINTS
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);

-- 3. UPDATED BATTLE-TESTED NEW USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  match_id uuid;
  _role public.app_role;
  _status public.profile_status;
  _phone_clean text;
BEGIN
  -- 1. Normalize phone if available
  _phone_clean := NEW.phone; 

  -- 2. Check for pre-existing profile (Invitations by Admin)
  -- Match by phone first (primary for this app) then email
  IF _phone_clean IS NOT NULL THEN
     SELECT id, role, status INTO match_id, _role, _status 
     FROM public.profiles 
     WHERE (phone = _phone_clean OR phone = REPLACE(_phone_clean, '+92', '0') OR phone = REPLACE(_phone_clean, '+92', ''))
     LIMIT 1;
  END IF;

  IF match_id IS NULL AND NEW.email IS NOT NULL THEN
     SELECT id, role, status INTO match_id, _role, _status 
     FROM public.profiles 
     WHERE email = NEW.email 
     LIMIT 1;
  END IF;

  IF match_id IS NOT NULL THEN
     -- 3. LINK Auth User to Pre-created Profile
     UPDATE public.profiles 
     SET user_id = NEW.id, 
         email = COALESCE(email, NEW.email),
         phone = COALESCE(phone, NEW.phone),
         updated_at = now()
     WHERE id = match_id;

     -- 4. SYNC LEGACY TABLES FOR BACKWARD COMPATIBILITY
     IF _role = 'rider' THEN
        UPDATE public.riders 
        SET user_id = NEW.id, 
            is_active = CASE WHEN _status = 'active' THEN true ELSE false END
        WHERE phone = _phone_clean OR email = NEW.email;
     END IF;
  ELSE
     -- 5. NEW USER (DEFAULT)
     INSERT INTO public.profiles (user_id, role, status, email, phone, full_name)
     VALUES (
       NEW.id,
       'customer',
       'active',
       NEW.email,
       NEW.phone,
       NEW.raw_user_meta_data->>'full_name'
     );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ENSURE ALL TABLES HAVE RLS ENABLED
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_applications ENABLE ROW LEVEL SECURITY;

-- 5. GLOBAL ADMIN POLICY
DO $$ 
BEGIN
    -- Profiles
    DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
    CREATE POLICY "Admins have full access to profiles" ON public.profiles
        FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));
        
    -- Riders
    DROP POLICY IF EXISTS "Admins manage riders" ON public.riders;
    CREATE POLICY "Admins manage riders" ON public.riders
        FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));

    -- Applications
    DROP POLICY IF EXISTS "Admins manage applications" ON public.rider_applications;
    CREATE POLICY "Admins manage applications" ON public.rider_applications
        FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));
END $$;
