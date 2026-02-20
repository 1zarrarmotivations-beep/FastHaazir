-- Role Consistency & Repair System (Fixed Recursion)
-- This migration ensures the role system is robust and self-correcting.

-- 1. Create centralized role definition type if not exists
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'rider', 'business', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create user_roles table to act as a definitive source (if not exists)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Function to sync roles seamlessly with RECURSION CHECK
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent infinite recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Sync FROM profiles TO user_roles
  IF TG_TABLE_NAME = 'profiles' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, NEW.role::text::public.app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  
  -- Sync FROM user_roles TO public
  ELSIF TG_TABLE_NAME = 'user_roles' THEN
    UPDATE public.profiles
    SET role = NEW.role::text
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Triggers to ensure double-consistency
DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;
CREATE TRIGGER on_profile_role_change
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW 
WHEN (pg_trigger_depth() < 1)
EXECUTE FUNCTION public.sync_user_role();

DROP TRIGGER IF EXISTS on_user_role_change ON public.user_roles;
CREATE TRIGGER on_user_role_change
AFTER INSERT OR UPDATE OF role ON public.user_roles
FOR EACH ROW 
WHEN (pg_trigger_depth() < 1)
EXECUTE FUNCTION public.sync_user_role();

-- 5. Enhanced get_my_role with SECURITY DEFINER and double check
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TABLE (
  role text,
  status text,
  needs_registration boolean,
  profile_id uuid,
  full_name text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _uid uuid;
    _profile record;
    _final_role text;
    _rider_status text;
    _auth_phone text;
    _needs_reg boolean := false;
BEGIN
    _uid := auth.uid();

    -- Handle unauthenticated
    IF _uid IS NULL THEN
        RETURN QUERY SELECT 'customer'::text, 'active'::text, false, NULL::uuid, 'Visitor'::text;
        RETURN;
    END IF;

    -- 1. Get Phone from Auth (Source of Truth for God Mode)
    SELECT phone INTO _auth_phone FROM auth.users WHERE id = _uid;

    -- 2. Check God Mode Override
    IF public.is_god_mode_number(_auth_phone) THEN
        _final_role := 'super_admin';
    ELSE
        -- 3. Double Check: Get from Profiles
        SELECT role::text INTO _final_role FROM public.profiles WHERE user_id = _uid;
        
        -- Fallback: Get from user_roles
        IF _final_role IS NULL THEN
            SELECT role::text INTO _final_role FROM public.user_roles WHERE user_id = _uid;
        END IF;

        -- Default to customer
        IF _final_role IS NULL THEN
            _final_role := 'customer';
        END IF;
    END IF;

    -- 4. Ensure Profile Exists & Is Synced
    SELECT * INTO _profile FROM public.profiles WHERE user_id = _uid;

    IF _profile.id IS NULL THEN
        -- Create new profile if missing
        INSERT INTO public.profiles (user_id, role, status, phone, full_name)
        VALUES (
            _uid, 
            _final_role::public.app_role, 
            'active', 
            _auth_phone, 
            CASE WHEN _final_role = 'super_admin' THEN 'System Master' ELSE 'New User' END
        )
        RETURNING * INTO _profile;
    ELSE
        -- Fix role mismatch
        IF _profile.role::text != _final_role THEN
            UPDATE public.profiles SET role = _final_role::public.app_role WHERE id = _profile.id;
            _profile.role := _final_role::public.app_role;
        END IF;
    END IF;

    -- 5. Rider Specific Checks
    IF _final_role = 'rider' THEN
        SELECT verification_status::text INTO _rider_status FROM public.riders WHERE user_id = _uid;
        IF _rider_status IS NULL OR _rider_status != 'verified' THEN
            _needs_reg := true;
        END IF;
    END IF;

    RETURN QUERY SELECT 
        _final_role::text, 
        COALESCE(_profile.status::text, 'active'), 
        _needs_reg, 
        _profile.id, 
        COALESCE(_profile.full_name, 'User')::text;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO service_role;
