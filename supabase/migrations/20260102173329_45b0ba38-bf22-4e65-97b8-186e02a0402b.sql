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
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  phone_norm := public.normalize_pk_phone_digits(_phone);

  IF phone_norm IS NULL THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  -- ADMIN OVERRIDE (hard rule)
  IF phone_norm = '923110111419' THEN
    INSERT INTO public.admins (phone, is_active, user_id, updated_at)
    VALUES (phone_norm, true, _uid, now())
    ON CONFLICT (phone) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          is_active = true,
          updated_at = now();

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'admin'::app_role)
    ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

    RETURN QUERY SELECT 'admin'::text, false;
    RETURN;
  END IF;

  -- 1) admins table (normalized compare)
  SELECT a.id, a.is_active
    INTO _id, _is_active
  FROM public.admins a
  WHERE public.normalize_pk_phone_digits(a.phone) = phone_norm
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.admins
      SET user_id = _uid,
          phone = phone_norm,
          updated_at = now()
    WHERE id = _id
      AND (user_id IS NULL OR user_id = _uid);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'admin'::app_role)
    ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

    RETURN QUERY SELECT 'admin'::text, (COALESCE(_is_active, true) = false);
    RETURN;
  END IF;

  -- 2) riders table (normalized compare)
  SELECT r.id, r.is_active
    INTO _id, _is_active
  FROM public.riders r
  WHERE public.normalize_pk_phone_digits(r.phone) = phone_norm
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.riders
      SET user_id = COALESCE(user_id, _uid),
          claimed = true,
          phone = phone_norm,
          updated_at = now()
    WHERE id = _id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'rider'::app_role)
    ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

    RETURN QUERY SELECT 'rider'::text, (COALESCE(_is_active, true) = false);
    RETURN;
  END IF;

  -- 3) businesses table (normalized compare)
  SELECT b.id, b.is_active
    INTO _id, _is_active
  FROM public.businesses b
  WHERE public.normalize_pk_phone_digits(b.owner_phone) = phone_norm
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.businesses
      SET owner_user_id = COALESCE(owner_user_id, _uid),
          claimed = true,
          owner_phone = phone_norm,
          updated_at = now()
    WHERE id = _id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'business'::app_role)
    ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

    RETURN QUERY SELECT 'business'::text, (COALESCE(_is_active, true) = false);
    RETURN;
  END IF;

  -- 4) customers (ensure profile exists)
  INSERT INTO public.customer_profiles (user_id, name)
  VALUES (_uid, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'customer'::app_role)
  ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

  RETURN QUERY SELECT 'customer'::text, false;
END;
$$;

-- Ensure authenticated users can execute (safe to re-run)
GRANT EXECUTE ON FUNCTION public.resolve_role_by_phone(text) TO authenticated;