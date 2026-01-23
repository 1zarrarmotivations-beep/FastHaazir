-- Migration: Remove Business Role from Auth System
-- Date: 2026-01-23
-- Purpose: Remove business login capability, keep admin as sole controller

-- Drop the old function and recreate without business check
CREATE OR REPLACE FUNCTION public.resolve_role_by_phone(_phone text)
 RETURNS TABLE(role text, is_blocked boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  phone_norm text;
  _id uuid;
  _user_id uuid;
  _is_active boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  phone_norm := public.normalize_pk_phone_digits(_phone);

  IF phone_norm IS NULL THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  -- ADMIN OVERRIDE (hard rule) - only if not already claimed by another user
  IF phone_norm = '923110111419' THEN
    -- Check if already claimed by a different user
    SELECT a.user_id INTO _user_id
    FROM public.admins a
    WHERE public.normalize_pk_phone_digits(a.phone) = phone_norm
    LIMIT 1;
    
    -- Only claim if unclaimed or already owned by this user
    IF _user_id IS NULL OR _user_id = _uid THEN
      INSERT INTO public.admins (phone, is_active, user_id, updated_at)
      VALUES (phone_norm, true, _uid, now())
      ON CONFLICT (phone) DO UPDATE
        SET user_id = CASE 
          WHEN admins.user_id IS NULL THEN EXCLUDED.user_id 
          WHEN admins.user_id = _uid THEN EXCLUDED.user_id
          ELSE admins.user_id 
        END,
            is_active = true,
            updated_at = now();

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'admin'::app_role)
      ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

      RETURN QUERY SELECT 'admin'::text, false;
      RETURN;
    END IF;
  END IF;

  -- 1) Check admins table - ONLY if already claimed by this user
  SELECT a.id, a.user_id, a.is_active
    INTO _id, _user_id, _is_active
  FROM public.admins a
  WHERE public.normalize_pk_phone_digits(a.phone) = phone_norm
  LIMIT 1;

  IF FOUND THEN
    -- Only allow access if unclaimed or owned by this user
    IF _user_id IS NULL OR _user_id = _uid THEN
      UPDATE public.admins
        SET user_id = COALESCE(user_id, _uid),
            phone = phone_norm,
            updated_at = now()
      WHERE id = _id
        AND (user_id IS NULL OR user_id = _uid);

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'admin'::app_role)
      ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

      RETURN QUERY SELECT 'admin'::text, (COALESCE(_is_active, true) = false);
      RETURN;
    ELSE
      -- Phone exists but claimed by different user - deny access
      RAISE EXCEPTION 'phone_already_claimed';
    END IF;
  END IF;

  -- 2) Check riders table - ONLY if already claimed by this user
  SELECT r.id, r.user_id, r.is_active
    INTO _id, _user_id, _is_active
  FROM public.riders r
  WHERE public.normalize_pk_phone_digits(r.phone) = phone_norm
  LIMIT 1;

  IF FOUND THEN
    -- Only allow access if unclaimed or owned by this user
    IF _user_id IS NULL OR _user_id = _uid THEN
      UPDATE public.riders
        SET user_id = COALESCE(user_id, _uid),
            claimed = true,
            phone = phone_norm,
            updated_at = now()
      WHERE id = _id
        AND (user_id IS NULL OR user_id = _uid);

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'rider'::app_role)
      ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

      RETURN QUERY SELECT 'rider'::text, (COALESCE(_is_active, true) = false);
      RETURN;
    ELSE
      -- Phone exists but claimed by different user - deny access
      RAISE EXCEPTION 'phone_already_claimed';
    END IF;
  END IF;

  -- 3) REMOVED: Business role check
  -- Businesses are now managed ONLY by admin
  -- No business owner can login

  -- 4) Default: create customer profile
  INSERT INTO public.customer_profiles (user_id, name)
  VALUES (_uid, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'customer'::app_role)
  ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

  RETURN QUERY SELECT 'customer'::text, false;
END;
$function$;

-- Update resolve_role_by_email to match (remove business check)
CREATE OR REPLACE FUNCTION public.resolve_role_by_email(_email text)
 RETURNS TABLE(role text, is_blocked boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _user_id uuid;
  _is_active boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- 1) Check admins table
  SELECT a.id, a.user_id, a.is_active
    INTO _id, _user_id, _is_active
  FROM public.admins a
  WHERE a.email = _email
  LIMIT 1;

  IF FOUND THEN
    IF _user_id IS NULL OR _user_id = _uid THEN
      UPDATE public.admins
        SET user_id = COALESCE(user_id, _uid),
            updated_at = now()
      WHERE id = _id
        AND (user_id IS NULL OR user_id = _uid);

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'admin'::app_role)
      ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

      RETURN QUERY SELECT 'admin'::text, (COALESCE(_is_active, true) = false);
      RETURN;
    ELSE
      RAISE EXCEPTION 'email_already_claimed';
    END IF;
  END IF;

  -- 2) Check riders table
  SELECT r.id, r.user_id, r.is_active
    INTO _id, _user_id, _is_active
  FROM public.riders r
  WHERE r.email = _email
  LIMIT 1;

  IF FOUND THEN
    IF _user_id IS NULL OR _user_id = _uid THEN
      UPDATE public.riders
        SET user_id = COALESCE(user_id, _uid),
            claimed = true,
            updated_at = now()
      WHERE id = _id
        AND (user_id IS NULL OR user_id = _uid);

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'rider'::app_role)
      ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

      RETURN QUERY SELECT 'rider'::text, (COALESCE(_is_active, true) = false);
      RETURN;
    ELSE
      RAISE EXCEPTION 'email_already_claimed';
    END IF;
  END IF;

  -- 3) REMOVED: Business role check
  -- Businesses managed by admin only

  -- 4) Default: customer
  INSERT INTO public.customer_profiles (user_id, name)
  VALUES (_uid, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'customer'::app_role)
  ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

  RETURN QUERY SELECT 'customer'::text, false;
END;
$function$;

-- Comment: Businesses table remains but is only accessible/manageable by admins
-- owner_phone and owner_user_id kept for record purposes but don't enable login
