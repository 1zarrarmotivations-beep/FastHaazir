-- ============================================================================
-- RIDER MANAGEMENT ARCHITECTURE OVERHAUL
-- Date: 2026-02-22
-- ============================================================================

-- 1. ENUM UPDATES
-- Add super_admin to app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';

-- Create profile_status enum
DO $$ BEGIN
    CREATE TYPE public.profile_status AS ENUM ('active', 'pending', 'blocked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. PROFILES TABLE REFINEMENT
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status public.profile_status DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Migrate is_blocked to status
UPDATE public.profiles 
SET status = CASE WHEN is_blocked = true THEN 'blocked'::public.profile_status ELSE 'active'::public.profile_status END
WHERE status IS NULL;

-- 3. RIDER APPLICATIONS ENHANCEMENTS
ALTER TABLE public.rider_applications ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.rider_applications ADD COLUMN IF NOT EXISTS seen_by_admin BOOLEAN DEFAULT false;

-- 4. ROBUST ROLE RESOLUTION FUNCTION
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TABLE (
    role text, 
    status text,
    needs_registration boolean,
    profile_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _uid uuid := auth.uid();
    _profile record;
    _rider_status text;
    _needs_reg boolean := false;
BEGIN
    IF _uid IS NULL THEN
        RETURN QUERY SELECT 'customer'::text, 'active'::text, false, NULL::uuid;
        RETURN;
    END IF;

    -- Get profile with highest priority
    SELECT id, role::text, status::text INTO _profile 
    FROM public.profiles 
    WHERE user_id = _uid;

    -- If no profile found, create one (safety trigger should have handled this)
    IF NOT FOUND THEN
        INSERT INTO public.profiles (user_id, role, status)
        VALUES (_uid, 'customer', 'active')
        RETURNING id, role::text, status::text INTO _profile;
    END IF;

    -- Specific status check for riders
    IF _profile.role = 'rider' THEN
        SELECT verification_status INTO _rider_status 
        FROM public.riders 
        WHERE user_id = _uid;
        
        IF _rider_status IS NULL OR _rider_status != 'verified' THEN
            _needs_reg := true;
        END IF;
    END IF;

    RETURN QUERY SELECT _profile.role, _profile.status, _needs_reg, _profile.id;
END;
$$;

-- 5. SUPER ADMIN ROLE ASSIGNMENT (HELPER)
-- Only super_admin can change roles to super_admin or admin
CREATE OR REPLACE FUNCTION public.update_user_role(
    target_user_id uuid,
    new_role public.app_role,
    new_status public.profile_status DEFAULT 'active'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_role public.app_role;
BEGIN
    -- Check caller role
    SELECT role INTO caller_role FROM public.profiles WHERE user_id = auth.uid();
    
    IF caller_role != 'super_admin' THEN
        RAISE EXCEPTION 'Only Super Admins can change user roles';
    END IF;

    UPDATE public.profiles 
    SET role = new_role,
        status = new_status,
        updated_at = now()
    WHERE user_id = target_user_id;

    RETURN FOUND;
END;
$$;

-- 6. RIDER APPROVAL FLOW
CREATE OR REPLACE FUNCTION public.approve_rider_application(
    application_id uuid,
    reviewer_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _target_user_id uuid;
    _app_status text;
BEGIN
    -- Verify reviewer is admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = reviewer_id AND role IN ('admin', 'super_admin')) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Get application info
    SELECT user_id, status INTO _target_user_id, _app_status FROM public.rider_applications WHERE id = application_id;
    
    IF _app_status = 'approved' THEN
        RETURN true;
    END IF;

    -- 1. Update Application
    UPDATE public.rider_applications 
    SET status = 'approved',
        approved_by = reviewer_id,
        updated_at = now()
    WHERE id = application_id;

    -- 2. Update Profile Role
    UPDATE public.profiles 
    SET role = 'rider',
        status = 'active',
        updated_at = now()
    WHERE user_id = _target_user_id;

    -- 3. Create/Update Rider Profile
    INSERT INTO public.riders (user_id, verification_status, is_active)
    VALUES (_target_user_id, 'verified', true)
    ON CONFLICT (user_id) DO UPDATE 
    SET verification_status = 'verified', 
        is_active = true;

    RETURN true;
END;
$$;

-- 7. RLS POLICIES (God Mode)
-- Super Admins can see everything
CREATE POLICY "Super Admins bypass all" ON public.profiles
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Super Admins manage all applications" ON public.rider_applications
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin'));
