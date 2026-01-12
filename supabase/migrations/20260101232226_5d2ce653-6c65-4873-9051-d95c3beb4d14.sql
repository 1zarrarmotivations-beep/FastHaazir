-- Phone normalization helper: Pakistan mobile digits in format 923XXXXXXXXX (no +)
CREATE OR REPLACE FUNCTION public.normalize_pk_phone_digits(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d text;
BEGIN
  d := regexp_replace(COALESCE(_phone, ''), '[^0-9]', '', 'g');

  IF d = '' THEN
    RETURN NULL;
  END IF;

  -- Handle 0092XXXXXXXXXX
  IF d LIKE '0092%' THEN
    d := '92' || substr(d, 5);
  END IF;

  -- If already has country code
  IF d LIKE '92%' THEN
    RETURN d;
  END IF;

  -- Local format 03XXXXXXXXX
  IF d LIKE '0%' THEN
    RETURN '92' || substr(d, 2);
  END IF;

  -- 10 digits local (3XXXXXXXXX)
  IF length(d) = 10 THEN
    RETURN '92' || d;
  END IF;

  -- Fallback: if user pasted full number without 0 and without 92, keep digits
  RETURN d;
END;
$$;

-- Normalize NEW.phone for tables that have a 'phone' column
CREATE OR REPLACE FUNCTION public.normalize_phone_column_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := public.normalize_pk_phone_digits(NEW.phone);
  END IF;
  RETURN NEW;
END;
$$;

-- Normalize NEW.owner_phone for businesses
CREATE OR REPLACE FUNCTION public.normalize_owner_phone_column_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_phone IS NOT NULL THEN
    NEW.owner_phone := public.normalize_pk_phone_digits(NEW.owner_phone);
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_admins_normalize_phone'
  ) THEN
    CREATE TRIGGER trg_admins_normalize_phone
    BEFORE INSERT OR UPDATE ON public.admins
    FOR EACH ROW
    EXECUTE FUNCTION public.normalize_phone_column_trigger();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_riders_normalize_phone'
  ) THEN
    CREATE TRIGGER trg_riders_normalize_phone
    BEFORE INSERT OR UPDATE ON public.riders
    FOR EACH ROW
    EXECUTE FUNCTION public.normalize_phone_column_trigger();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_businesses_normalize_owner_phone'
  ) THEN
    CREATE TRIGGER trg_businesses_normalize_owner_phone
    BEFORE INSERT OR UPDATE ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.normalize_owner_phone_column_trigger();
  END IF;
END;
$$;

-- Role resolver: enforce strict priority admin > rider > business > customer
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

      role := 'admin';
      is_blocked := COALESCE(_is_active, true) = false;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  -- 1b) existing admins via roles (legacy)
  IF public.has_role(_uid, 'admin'::app_role) THEN
    role := 'admin';
    is_blocked := false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- 2) riders (already linked)
  SELECT r.id, r.is_active
    INTO _id, _is_active
  FROM public.riders r
  WHERE r.user_id = _uid
  LIMIT 1;

  IF FOUND THEN
    role := 'rider';
    is_blocked := COALESCE(_is_active, true) = false;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'rider'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEXT;
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

      role := 'rider';
      is_blocked := COALESCE(_is_active, true) = false;
      RETURN NEXT;
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
    role := 'business';
    is_blocked := COALESCE(_is_active, true) = false;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'business'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEXT;
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

      role := 'business';
      is_blocked := COALESCE(_is_active, true) = false;
      RETURN NEXT;
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

  role := 'customer';
  is_blocked := false;
  RETURN NEXT;
END;
$$;

-- Realtime: publish role-related tables (idempotent) + full row payload
ALTER TABLE public.admins REPLICA IDENTITY FULL;
ALTER TABLE public.riders REPLICA IDENTITY FULL;
ALTER TABLE public.businesses REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admins;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.riders;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.businesses;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END;
$$;