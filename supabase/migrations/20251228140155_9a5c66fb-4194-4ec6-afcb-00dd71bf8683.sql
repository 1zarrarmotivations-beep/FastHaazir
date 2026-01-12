-- Fix role detection + account claiming by phone (bypasses RLS safely)

CREATE OR REPLACE FUNCTION public.resolve_role_by_phone(_phone text)
RETURNS TABLE(role text, is_blocked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  phone_clean text;
  suffix text;
  _id uuid;
  _is_active boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  phone_clean := regexp_replace(COALESCE(_phone, ''), '[^0-9]', '', 'g');
  suffix := right(phone_clean, 10);

  -- 1) admins (authoritative via user_roles)
  IF public.has_role(_uid, 'admin'::app_role) THEN
    role := 'admin';
    is_blocked := false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- 2) riders (already linked)
  SELECT id, is_active
    INTO _id, _is_active
  FROM public.riders
  WHERE user_id = _uid
  LIMIT 1;

  IF FOUND THEN
    role := 'rider';
    is_blocked := COALESCE(_is_active, true) = false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- 2b) riders (claim by phone)
  SELECT id, is_active
    INTO _id, _is_active
  FROM public.riders
  WHERE user_id IS NULL
    AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = suffix
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.riders
    SET user_id = _uid,
        claimed = true,
        updated_at = now()
    WHERE id = _id;

    role := 'rider';
    is_blocked := COALESCE(_is_active, true) = false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- 3) businesses (already linked)
  SELECT id, is_active
    INTO _id, _is_active
  FROM public.businesses
  WHERE owner_user_id = _uid
  LIMIT 1;

  IF FOUND THEN
    role := 'business';
    is_blocked := COALESCE(_is_active, true) = false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- 3b) businesses (claim by phone)
  SELECT id, is_active
    INTO _id, _is_active
  FROM public.businesses
  WHERE owner_user_id IS NULL
    AND owner_phone IS NOT NULL
    AND right(regexp_replace(owner_phone, '[^0-9]', '', 'g'), 10) = suffix
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.businesses
    SET owner_user_id = _uid,
        claimed = true,
        updated_at = now()
    WHERE id = _id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'business'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    role := 'business';
    is_blocked := COALESCE(_is_active, true) = false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- 4) customers (ensure profile exists)
  INSERT INTO public.customer_profiles (user_id, name)
  VALUES (_uid, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  role := 'customer';
  is_blocked := false;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_role_by_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_role_by_phone(text) TO authenticated;
