-- 1) Expand app_role enum to support rider/customer without breaking existing values
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'app_role'
        AND e.enumlabel = 'rider'
    ) THEN
      ALTER TYPE public.app_role ADD VALUE 'rider';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'app_role'
        AND e.enumlabel = 'customer'
    ) THEN
      ALTER TYPE public.app_role ADD VALUE 'customer';
    END IF;
  END IF;
END $$;

-- 2) Admin phone allowlist table (pre-authorize admins before login)
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  user_id uuid NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Select
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admins' AND policyname = 'Admins can view admins allowlist'
  ) THEN
    CREATE POLICY "Admins can view admins allowlist"
    ON public.admins
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;

  -- Insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admins' AND policyname = 'Admins can manage admins allowlist (insert)'
  ) THEN
    CREATE POLICY "Admins can manage admins allowlist (insert)"
    ON public.admins
    FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;

  -- Update
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admins' AND policyname = 'Admins can manage admins allowlist (update)'
  ) THEN
    CREATE POLICY "Admins can manage admins allowlist (update)"
    ON public.admins
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;

  -- Delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admins' AND policyname = 'Admins can manage admins allowlist (delete)'
  ) THEN
    CREATE POLICY "Admins can manage admins allowlist (delete)"
    ON public.admins
    FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- updated_at trigger for admins
DROP TRIGGER IF EXISTS update_admins_updated_at ON public.admins;
CREATE TRIGGER update_admins_updated_at
BEFORE UPDATE ON public.admins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Normalize existing phone columns to E.164 (+92...) for Pakistan
-- Riders phone
UPDATE public.riders
SET phone = (
  WITH v AS (
    SELECT regexp_replace(COALESCE(public.riders.phone, ''), '[^0-9]', '', 'g') AS d
  )
  SELECT CASE
    WHEN v.d = '' THEN public.riders.phone
    WHEN v.d LIKE '92%' THEN '+' || v.d
    WHEN v.d LIKE '0%' THEN '+92' || substr(v.d, 2)
    WHEN length(v.d) = 10 THEN '+92' || v.d
    ELSE '+' || v.d
  END
  FROM v
)
WHERE phone IS NOT NULL;

-- Businesses owner_phone
UPDATE public.businesses
SET owner_phone = (
  WITH v AS (
    SELECT regexp_replace(COALESCE(public.businesses.owner_phone, ''), '[^0-9]', '', 'g') AS d
  )
  SELECT CASE
    WHEN v.d = '' THEN public.businesses.owner_phone
    WHEN v.d LIKE '92%' THEN '+' || v.d
    WHEN v.d LIKE '0%' THEN '+92' || substr(v.d, 2)
    WHEN length(v.d) = 10 THEN '+92' || v.d
    ELSE '+' || v.d
  END
  FROM v
)
WHERE owner_phone IS NOT NULL;

-- Admins allowlist phone
UPDATE public.admins
SET phone = (
  WITH v AS (
    SELECT regexp_replace(COALESCE(public.admins.phone, ''), '[^0-9]', '', 'g') AS d
  )
  SELECT CASE
    WHEN v.d = '' THEN public.admins.phone
    WHEN v.d LIKE '92%' THEN '+' || v.d
    WHEN v.d LIKE '0%' THEN '+92' || substr(v.d, 2)
    WHEN length(v.d) = 10 THEN '+92' || v.d
    ELSE '+' || v.d
  END
  FROM v
)
WHERE phone IS NOT NULL;

-- Helpful indexes for role resolution by phone
CREATE INDEX IF NOT EXISTS idx_riders_phone ON public.riders (phone);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_phone ON public.businesses (owner_phone);
CREATE INDEX IF NOT EXISTS idx_admins_phone ON public.admins (phone);

-- 4) Replace resolve_role_by_phone with strict E.164 matching + strict order:
-- admins -> riders -> businesses -> customers
CREATE OR REPLACE FUNCTION public.resolve_role_by_phone(_phone text)
RETURNS TABLE(role text, is_blocked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  phone_digits text;
  phone_norm text;
  _id uuid;
  _is_active boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  phone_digits := regexp_replace(COALESCE(_phone, ''), '[^0-9]', '', 'g');

  -- Pakistan E.164 normalization (+92...)
  phone_norm := CASE
    WHEN phone_digits = '' THEN NULL
    WHEN phone_digits LIKE '92%' THEN '+' || phone_digits
    WHEN phone_digits LIKE '0%' THEN '+92' || substr(phone_digits, 2)
    WHEN length(phone_digits) = 10 THEN '+92' || phone_digits
    ELSE '+' || phone_digits
  END;

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

  -- Keep roles table authoritative (no local caching); record as customer role for consistent routing.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'customer'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  role := 'customer';
  is_blocked := false;
  RETURN NEXT;
END;
$$;