-- Fix linter: pin search_path on newly added helper/trigger functions
CREATE OR REPLACE FUNCTION public.normalize_pk_phone_digits(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  d text;
BEGIN
  d := regexp_replace(COALESCE(_phone, ''), '[^0-9]', '', 'g');

  IF d = '' THEN
    RETURN NULL;
  END IF;

  IF d LIKE '0092%' THEN
    d := '92' || substr(d, 5);
  END IF;

  IF d LIKE '92%' THEN
    RETURN d;
  END IF;

  IF d LIKE '0%' THEN
    RETURN '92' || substr(d, 2);
  END IF;

  IF length(d) = 10 THEN
    RETURN '92' || d;
  END IF;

  RETURN d;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_phone_column_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := public.normalize_pk_phone_digits(NEW.phone);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_owner_phone_column_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.owner_phone IS NOT NULL THEN
    NEW.owner_phone := public.normalize_pk_phone_digits(NEW.owner_phone);
  END IF;
  RETURN NEW;
END;
$$;