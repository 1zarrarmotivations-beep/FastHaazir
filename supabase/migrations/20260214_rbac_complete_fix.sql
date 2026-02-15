-- ============================================================================
-- COMPREHENSIVE RBAC FIX FOR FASTHAAZIR
-- Date: 2026-02-14
-- Purpose: Fix role resolution issues and create strict separation between 
--          Admin, Rider, and Customer roles
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE THE MISSING get_my_role FUNCTION
-- This is the PRIMARY function used by frontend to determine user role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TABLE(role text, is_blocked boolean, needs_registration boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _role text := 'customer';
  _is_blocked boolean := false;
  _needs_registration boolean := false;
  _rider_record record;
BEGIN
  IF _uid IS NULL THEN
    RETURN QUERY SELECT 'customer'::text, false, false;
    RETURN;
  END IF;

  -- PRIORITY 1: Check if user is an admin (highest priority)
  -- Admins have supreme access
  IF EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = _uid AND is_active = true
  ) THEN
    -- Get admin blocked status
    SELECT a.is_active INTO _is_blocked
    FROM public.admins a
    WHERE a.user_id = _uid;
    
    _is_blocked := COALESCE(_is_blocked, true) = false;
    RETURN QUERY SELECT 'admin'::text, _is_blocked, false;
    RETURN;
  END IF;

  -- PRIORITY 2: Check if user is a rider
  -- Must have both user_roles entry AND valid rider record
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _uid AND role = 'rider'
  ) THEN
    -- Verify rider record exists and is valid
    SELECT r.id, r.is_active, r.verification_status, r.user_id IS NOT NULL AS has_user_id
    INTO _rider_record
    FROM public.riders r
    WHERE r.user_id = _uid
    LIMIT 1;

    IF NOT FOUND OR _rider_record.id IS NULL THEN
      -- Rider role exists but no rider record - needs registration
      _needs_registration := true;
      _is_blocked := false;
    ELSE
      _is_blocked := COALESCE(_rider_record.is_active, true) = false;
      _needs_registration := false;
    END IF;

    RETURN QUERY SELECT 'rider'::text, _is_blocked, _needs_registration;
    RETURN;
  END IF;

  -- PRIORITY 3: Default to customer
  -- If no admin or rider role, user is a customer
  RETURN QUERY SELECT 'customer'::text, false, false;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- ============================================================================
-- PART 2: FIX resolve_role_by_email FUNCTION
-- Ensure rider role is properly assigned when logging in with email
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_role_by_email(_email text)
RETURNS TABLE(role text, is_blocked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  email_lower text;
  _id uuid;
  _user_id uuid;
  _is_active boolean;
  _verification_status text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  email_lower := lower(trim(_email));

  IF email_lower IS NULL OR email_lower = '' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  -- PRIORITY 1: Check admins table first (highest priority)
  SELECT a.id, a.user_id, a.is_active
    INTO _id, _user_id, _is_active
  FROM public.admins a
  WHERE lower(a.email) = email_lower
  LIMIT 1;

  IF FOUND THEN
    IF _user_id IS NULL OR _user_id = _uid THEN
      UPDATE public.admins
        SET user_id = COALESCE(user_id, _uid),
            updated_at = now()
      WHERE id = _id
        AND (user_id IS NULL OR user_id = _uid);

      -- Ensure admin role exists
      INSERT INTO public.user_roles (user_id, role)
        VALUES (_uid, 'admin'::app_role)
      ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

      -- Remove any other roles to ensure strict separation
      DELETE FROM public.user_roles 
        WHERE user_id = _uid AND role NOT IN ('admin', 'customer');

      RETURN QUERY SELECT 'admin'::text, (COALESCE(_is_active, true) = false);
      RETURN;
    ELSE
      RAISE EXCEPTION 'email_already_claimed_by_other_user';
    END IF;
  END IF;

  -- PRIORITY 2: Check riders table
  SELECT r.id, r.user_id, r.is_active, r.verification_status
    INTO _id, _user_id, _is_active, _verification_status
  FROM public.riders r
  WHERE lower(r.email) = email_lower
  LIMIT 1;

  IF FOUND THEN
    IF _user_id IS NULL OR _user_id = _uid THEN
      UPDATE public.riders
        SET user_id = COALESCE(user_id, _uid),
            claimed = true,
            updated_at = now()
      WHERE id = _id
        AND (user_id IS NULL OR user_id = _uid);

      -- Ensure rider role exists
      INSERT INTO public.user_roles (user_id, role)
        VALUES (_uid, 'rider'::app_role)
      ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

      -- Remove admin role if exists (strict separation)
      DELETE FROM public.user_roles 
        WHERE user_id = _uid AND role = 'admin';

      -- Return rider role - blocked if not active
      RETURN QUERY SELECT 'rider'::text, (COALESCE(_is_active, true) = false);
      RETURN;
    ELSE
      RAISE EXCEPTION 'email_already_claimed_by_other_user';
    END IF;
  END IF;

  -- PRIORITY 3: Default to customer role (new user)
  -- Ensure customer role exists
  INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'customer'::app_role)
  ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

  -- Remove any stray admin/rider roles for new email users
  -- (prevents access if somehow orphaned)
  DELETE FROM public.user_roles 
    WHERE user_id = _uid AND role IN ('admin', 'rider');

  RETURN QUERY SELECT 'customer'::text, false;
END;
$$;

-- ============================================================================
-- PART 3: FIX resolve_role_by_phone FUNCTION  
-- Ensure consistent phone-based role resolution
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_role_by_phone(_phone text)
RETURNS TABLE(role text, is_blocked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  phone_norm text;
  _id uuid;
  _user_id uuid;
  _is_active boolean;
  _verification_status text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Normalize phone number
  phone_norm := public.normalize_pk_phone_digits(_phone);

  IF phone_norm IS NULL OR phone_norm = '' THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  -- PRIORITY 1: Check admins table (highest priority)
  SELECT a.id, a.user_id, a.is_active
    INTO _id, _user_id, _is_active
  FROM public.admins a
  WHERE public.normalize_pk_phone_digits(a.phone) = phone_norm
  LIMIT 1;

  IF FOUND THEN
    IF _user_id IS NULL OR _user_id = _uid THEN
      UPDATE public.admins
        SET user_id = COALESCE(user_id, _uid),
            updated_at = now()
      WHERE id = _id
        AND (user_id IS NULL OR user_id = _uid);

      -- Ensure admin role exists
      INSERT INTO public.user_roles (user_id, role)
        VALUES (_uid, 'admin'::app_role)
      ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

      -- Remove any other roles
      DELETE FROM public.user_roles 
        WHERE user_id = _uid AND role NOT IN ('admin', 'customer');

      RETURN QUERY SELECT 'admin'::text, (COALESCE(_is_active, true) = false);
      RETURN;
    ELSE
      RAISE EXCEPTION 'phone_already_claimed_by_other_user';
    END IF;
  END IF;

  -- PRIORITY 2: Check riders table
  SELECT r.id, r.user_id, r.is_active, r.verification_status
    INTO _id, _user_id, _is_active, _verification_status
  FROM public.riders r
  WHERE public.normalize_pk_phone_digits(r.phone) = phone_norm
  LIMIT 1;

  IF FOUND THEN
    IF _user_id IS NULL OR _user_id = _uid THEN
      UPDATE public.riders
        SET user_id = COALESCE(user_id, _uid),
            claimed = true,
            updated_at = now()
      WHERE id = _id
        AND (user_id IS NULL OR user_id = _uid);

      -- Ensure rider role exists
      INSERT INTO public.user_roles (user_id, role)
        VALUES (_uid, 'rider'::app_role)
      ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

      -- Remove admin role if exists
      DELETE FROM public.user_roles 
        WHERE user_id = _uid AND role = 'admin';

      RETURN QUERY SELECT 'rider'::text, (COALESCE(_is_active, true) = false);
      RETURN;
    ELSE
      RAISE EXCEPTION 'phone_already_claimed_by_other_user';
    END IF;
  END IF;

  -- PRIORITY 3: Default to customer
  INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'customer'::app_role)
  ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

  -- Remove stray roles
  DELETE FROM public.user_roles 
    WHERE user_id = _uid AND role IN ('admin', 'rider');

  RETURN QUERY SELECT 'customer'::text, false;
END;
$$;

-- ============================================================================
-- PART 4: CREATE has_role FUNCTION (robust version)
-- Used by RLS policies for authorization
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role_check text;
BEGIN
  IF _user_id IS NULL OR _role IS NULL THEN
    RETURN false;
  END IF;

  _role_check := lower(trim(_role));

  -- Admin role check (checks both admins table and user_roles)
  IF _role_check = 'admin' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = _user_id AND is_active = true
    ) OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'admin'::app_role
    );
  END IF;

  -- Rider role check (requires BOTH user_roles entry AND valid rider record)
  IF _role_check = 'rider' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.riders r ON r.user_id = ur.user_id
      WHERE ur.user_id = _user_id 
        AND ur.role = 'rider'::app_role
        AND r.is_active = true
    );
  END IF;

  -- Customer role check
  IF _role_check = 'customer' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'customer'::app_role
    );
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;

-- ============================================================================
-- PART 5: CLEANUP ORPHANED ROLES
-- Remove conflicting roles to ensure strict separation
-- ============================================================================

-- For each user with multiple roles, keep only the highest priority role
-- Priority: admin > rider > customer

-- First, clean up users who are admins but also have rider role
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT DISTINCT ur1.user_id
  FROM public.user_roles ur1
  JOIN public.user_roles ur2 ON ur1.user_id = ur2.user_id
  WHERE ur1.role = 'admin'::app_role 
    AND ur2.role = 'rider'::app_role
)
AND role = 'rider'::app_role;

-- Verify the cleanup worked
DO $$
DECLARE
  conflict_count integer;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM (
    SELECT user_id, array_agg(role::text) as roles
    FROM public.user_roles
    WHERE role IN ('admin', 'rider')
    GROUP BY user_id
    HAVING COUNT(DISTINCT role) > 1
  ) conflicts;

  IF conflict_count > 0 THEN
    RAISE WARNING 'Found % users with conflicting roles', conflict_count;
  ELSE
    RAISE NOTICE 'Role cleanup complete - no conflicts found';
  END IF;
END $$;

-- ============================================================================
-- PART 6: ADD DIAGNOSTIC VIEW
-- Help debug role issues
-- ============================================================================

DROP VIEW IF EXISTS public.user_role_debug;

CREATE OR REPLACE VIEW public.user_role_debug AS
SELECT 
  u.id as user_id,
  u.email,
  u.phone,
  COALESCE(a.id IS NOT NULL, false) as is_admin_record,
  COALESCE(r.id IS NOT NULL, false) as is_rider_record,
  COALESCE(a.is_active, true) as admin_active,
  COALESCE(r.is_active, true) as rider_active,
  array_agg(DISTINCT ur.role::text) FILTER (WHERE ur.role IS NOT NULL) as user_roles,
  CASE 
    WHEN a.id IS NOT NULL AND a.is_active = true THEN 'admin'
    WHEN r.id IS NOT NULL AND r.is_active = true THEN 'rider'
    ELSE 'customer'
  END as effective_role,
  CASE
    WHEN a.id IS NOT NULL AND a.is_active = false THEN 'admin_blocked'
    WHEN r.id IS NOT NULL AND r.is_active = false THEN 'rider_blocked'
    ELSE 'active'
  END as status
FROM auth.users u
LEFT JOIN public.admins a ON a.user_id = u.id
LEFT JOIN public.riders r ON r.user_id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
GROUP BY u.id, u.email, u.phone, a.id, a.is_active, r.id, r.is_active;

GRANT SELECT ON public.user_role_debug TO authenticated;

-- ============================================================================
-- PART 7: ENFORCE STRICT SEPARATION - ADMINS NOT IN RIDERS/CUSTOMERS
-- Add triggers to prevent admins from being in rider or customer tables
-- ============================================================================

-- Function to prevent admin being in riders table
CREATE OR REPLACE FUNCTION public.prevent_admin_in_riders()
RETURNS TRIGGER AS $
BEGIN
    -- Check if user is an admin
    IF EXISTS (
        SELECT 1 FROM public.admins 
        WHERE user_id = NEW.user_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'User is an admin and cannot be added to riders table';
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS trg_prevent_admin_in_riders ON public.riders;

-- Create trigger to prevent admins in riders
CREATE TRIGGER trg_prevent_admin_in_riders
BEFORE INSERT OR UPDATE ON public.riders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_in_riders();

-- Function to prevent admin being in customer_profiles table
CREATE OR REPLACE FUNCTION public.prevent_admin_in_customers()
RETURNS TRIGGER AS $
BEGIN
    -- Check if user is an admin
    IF EXISTS (
        SELECT 1 FROM public.admins 
        WHERE user_id = NEW.user_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'User is an admin and cannot be added to customer_profiles table';
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_prevent_admin_in_customers ON public.customer_profiles;

-- Create trigger to prevent admins in customers
CREATE TRIGGER trg_prevent_admin_in_customers
BEFORE INSERT OR UPDATE ON public.customer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_in_customers();

-- ============================================================================
-- PART 8: RIDER SUSPENSION FUNCTIONALITY
-- Admins can suspend/unsuspend riders by setting is_active in riders table
-- ============================================================================

-- Function to handle rider suspension
CREATE OR REPLACE FUNCTION public.suspend_rider(_rider_id uuid, _suspend boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin'::text) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Update suspension status
  UPDATE public.riders
  SET is_active = NOT _suspend,
      updated_at = now()
  WHERE id = _rider_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rider not found';
  END IF;

  RETURN true;
END;
$;

GRANT EXECUTE ON FUNCTION public.suspend_rider(uuid, boolean) TO authenticated;

-- ============================================================================
-- PART 9: CLEANUP EXISTING CONFLICTS
-- Remove any admins that might already exist in riders or customers
-- ============================================================================

-- Remove admins from riders table (if any exist)
DELETE FROM public.riders 
WHERE user_id IN (
    SELECT user_id FROM public.admins WHERE user_id IS NOT NULL
);

-- Remove admins from customer_profiles table (if any exist)
DELETE FROM public.customer_profiles 
WHERE user_id IN (
    SELECT user_id FROM public.admins WHERE user_id IS NOT NULL
);

-- ============================================================================
-- PART 9: NOTIFY COMPLETION
-- ============================================================================

DO $
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RBAC FIX COMPLETED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Functions created/updated:';
  RAISE NOTICE '  - get_my_role() - PRIMARY role resolution';
  RAISE NOTICE '  - resolve_role_by_email() - Email login resolution';
  RAISE NOTICE '  - resolve_role_by_phone() - Phone login resolution';
  RAISE NOTICE '  - has_role() - RLS authorization helper';
  RAISE NOTICE '';
  RAISE NOTICE 'Key fixes applied:';
  RAISE NOTICE '  1. Strict role separation (admin > rider > customer)';
  RAISE NOTICE '  2. Rider requires BOTH user_roles entry AND valid rider record';
  RAISE NOTICE '  3. Automatic cleanup of conflicting roles';
  RAISE NOTICE '  4. Added user_role_debug view for diagnostics';
  RAISE NOTICE '  5. Admins CANNOT exist in riders or customers tables';
  RAISE NOTICE '';
  RAISE NOTICE 'Test with: SELECT * FROM public.user_role_debug;';
  RAISE NOTICE '========================================';
END $;
