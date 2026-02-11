-- =========================================================
-- ADMIN EMAIL LOGIN FIX
-- Issue: Admin logs in successfully but doesn't redirect to /admin
-- =========================================================

-- 1. Verify admin exists and email is correctly lowercased
UPDATE public.admins 
SET email = LOWER(email)
WHERE email IS NOT NULL;

-- 2. Ensure resolve_role_by_email returns correct data
-- This is the same function but with better error handling
CREATE OR REPLACE FUNCTION public.resolve_role_by_email(_email text)
 RETURNS TABLE(role text, is_blocked boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email_lower text := LOWER(TRIM(_email)); -- Added TRIM
  _id uuid;
  _user_id uuid;
  _is_active boolean;
BEGIN
  -- Log for debugging (will show in Supabase logs)
  RAISE LOG 'resolve_role_by_email called with email: %, uid: %', _email_lower, _uid;

  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- 1) Check admins table (Case insensitive)
  SELECT a.id, a.user_id, a.is_active
    INTO _id, _user_id, _is_active
  FROM public.admins a
  WHERE LOWER(TRIM(a.email)) = _email_lower
  LIMIT 1;

  IF FOUND THEN
    RAISE LOG 'Admin found: id=%, user_id=%, is_active=%', _id, _user_id, _is_active;
    
    IF _user_id IS NULL OR _user_id = _uid THEN
      -- Link admin to current user
      UPDATE public.admins
        SET user_id = COALESCE(user_id, _uid),
            updated_at = NOW()
        WHERE id = _id
        AND (user_id IS NULL OR user_id = _uid);

      -- Ensure user_roles entry
      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'admin'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      RAISE LOG 'Admin role assigned successfully';
      RETURN QUERY SELECT 'admin'::text, (COALESCE(_is_active, TRUE) = FALSE);
      RETURN;
    ELSE
      RAISE EXCEPTION 'email_already_claimed';
    END IF;
  END IF;

  -- 2) Check riders table (Case insensitive)
  SELECT r.id, r.user_id, r.is_active
    INTO _id, _user_id, _is_active
  FROM public.riders r
  WHERE LOWER(TRIM(r.email)) = _email_lower
  LIMIT 1;

  IF FOUND THEN
    IF _user_id IS NULL OR _user_id = _uid THEN
      UPDATE public.riders
        SET user_id = COALESCE(user_id, _uid),
            claimed = TRUE,
            updated_at = NOW()
        WHERE id = _id
        AND (user_id IS NULL OR user_id = _uid);

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'rider'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      RETURN QUERY SELECT 'rider'::text, (COALESCE(_is_active, TRUE) = FALSE);
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
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN QUERY SELECT 'customer'::text, FALSE;
END;
$function$;

-- 3. Verify admin account exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.admins WHERE LOWER(email) = 'zohaibhassen0@gmail.com') THEN
        RAISE NOTICE 'Admin account does not exist. Creating it now...';
        INSERT INTO public.admins (email, phone, is_active)
        VALUES ('zohaibhassen0@gmail.com', '+923001234567', TRUE)
        ON CONFLICT DO NOTHING;
    ELSE
        RAISE NOTICE 'Admin account exists';
    END IF;
END $$;

-- 4. Test the function (Run this manually after login to debug)
-- SELECT * FROM resolve_role_by_email('zohaibhassen0@gmail.com');
