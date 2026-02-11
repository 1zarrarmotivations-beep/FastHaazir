-- Migration to make auth resolution case-insensitive and more robust
-- Date: 2026-02-06
-- Purpose: Ensure email/phone matching is case-insensitive and robust against formatting differences

-- 1. Update resolve_role_by_email to use LOWER() for email comparison
CREATE OR REPLACE FUNCTION public.resolve_role_by_email(_email text)
 RETURNS TABLE(role text, is_blocked boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email_lower text := lower(_email);
  _id uuid;
  _user_id uuid;
  _is_active boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- 1) Check admins table (Case insensitive)
  SELECT a.id, a.user_id, a.is_active
    INTO _id, _user_id, _is_active
  FROM public.admins a
  WHERE lower(a.email) = _email_lower
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

  -- 2) Check riders table (Case insensitive)
  SELECT r.id, r.user_id, r.is_active
    INTO _id, _user_id, _is_active
  FROM public.riders r
  WHERE lower(r.email) = _email_lower
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

-- 2. Ensure admin email is lowered in database to matches
UPDATE public.admins SET email = lower(email);
