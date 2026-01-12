-- Fix: rename output variables to avoid column name conflicts
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
  _is_active boolean;
  _role text;
  _blocked boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  phone_norm := public.normalize_pk_phone_digits(_phone);

  -- 1) admins (phone allowlist)
  IF phone_norm IS NOT NULL THEN
    SELECT a.id, a.is_active
      INTO _id, _is_active
    FROM public.admins a
    WHERE a.phone = phone_norm
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.admins
      SET user_id = _uid,
          updated_at = now()
      WHERE id = _id
        AND (user_id IS NULL OR user_id = _uid);

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'admin'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      _role := 'admin';
      _blocked := COALESCE(_is_active, true) = false;
      RETURN QUERY SELECT _role, _blocked;
      RETURN;
    END IF;
  END IF;

  -- 1b) existing admins via roles (legacy)
  IF public.has_role(_uid, 'admin'::app_role) THEN
    RETURN QUERY SELECT 'admin'::text, false;
    RETURN;
  END IF;

  -- 2) riders (already linked)
  SELECT r.id, r.is_active
    INTO _id, _is_active
  FROM public.riders r
  WHERE r.user_id = _uid
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'rider'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    _role := 'rider';
    _blocked := COALESCE(_is_active, true) = false;
    RETURN QUERY SELECT _role, _blocked;
    RETURN;
  END IF;

  -- 2b) riders (claim by phone)
  IF phone_norm IS NOT NULL THEN
    SELECT r.id, r.is_active
      INTO _id, _is_active
    FROM public.riders r
    WHERE r.user_id IS NULL
      AND r.phone = phone_norm
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.riders
      SET user_id = _uid,
          claimed = true,
          phone = phone_norm,
          updated_at = now()
      WHERE id = _id;

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'rider'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      _role := 'rider';
      _blocked := COALESCE(_is_active, true) = false;
      RETURN QUERY SELECT _role, _blocked;
      RETURN;
    END IF;
  END IF;

  -- 3) businesses (already linked)
  SELECT b.id, b.is_active
    INTO _id, _is_active
  FROM public.businesses b
  WHERE b.owner_user_id = _uid
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'business'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    _role := 'business';
    _blocked := COALESCE(_is_active, true) = false;
    RETURN QUERY SELECT _role, _blocked;
    RETURN;
  END IF;

  -- 3b) businesses (claim by phone)
  IF phone_norm IS NOT NULL THEN
    SELECT b.id, b.is_active
      INTO _id, _is_active
    FROM public.businesses b
    WHERE b.owner_user_id IS NULL
      AND b.owner_phone = phone_norm
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.businesses
      SET owner_user_id = _uid,
          claimed = true,
          owner_phone = phone_norm,
          updated_at = now()
      WHERE id = _id;

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'business'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      _role := 'business';
      _blocked := COALESCE(_is_active, true) = false;
      RETURN QUERY SELECT _role, _blocked;
      RETURN;
    END IF;
  END IF;

  -- 4) customers (ensure profile exists)
  INSERT INTO public.customer_profiles (user_id, name)
  VALUES (_uid, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'customer'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN QUERY SELECT 'customer'::text, false;
END;
$$;