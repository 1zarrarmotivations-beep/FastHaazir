-- Add email column to admins, riders, and businesses tables for multi-auth support
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS owner_email text;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_riders_email ON public.riders(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_owner_email ON public.businesses(owner_email) WHERE owner_email IS NOT NULL;

-- Create function to resolve role by email (for Google/Email login)
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
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  email_lower := lower(trim(_email));

  IF email_lower IS NULL OR email_lower = '' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  -- 1) Check admins table
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

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'rider'::app_role)
      ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

      RETURN QUERY SELECT 'rider'::text, (COALESCE(_is_active, true) = false);
      RETURN;
    ELSE
      RAISE EXCEPTION 'email_already_claimed';
    END IF;
  END IF;

  -- 3) Check businesses table
  SELECT b.id, b.owner_user_id, b.is_active
    INTO _id, _user_id, _is_active
  FROM public.businesses b
  WHERE lower(b.owner_email) = email_lower
  LIMIT 1;

  IF FOUND THEN
    IF _user_id IS NULL OR _user_id = _uid THEN
      UPDATE public.businesses
        SET owner_user_id = COALESCE(owner_user_id, _uid),
            claimed = true,
            updated_at = now()
      WHERE id = _id
        AND (owner_user_id IS NULL OR owner_user_id = _uid);

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'business'::app_role)
      ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

      RETURN QUERY SELECT 'business'::text, (COALESCE(_is_active, true) = false);
      RETURN;
    ELSE
      RAISE EXCEPTION 'email_already_claimed';
    END IF;
  END IF;

  -- 4) Default to customer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'customer'::app_role)
  ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

  RETURN QUERY SELECT 'customer'::text, false;
END;
$$;