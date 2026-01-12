-- Link signed-in users to an admin-created business via phone number (no triggers on reserved schemas)
CREATE OR REPLACE FUNCTION public.link_user_by_phone(_user_id uuid, _phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phone_clean text;
  linked_business_id uuid;
BEGIN
  IF _user_id IS NULL OR _phone IS NULL OR length(trim(_phone)) = 0 THEN
    RETURN;
  END IF;

  phone_clean := regexp_replace(_phone, '[^0-9]', '', 'g');
  IF length(phone_clean) < 7 THEN
    RETURN;
  END IF;

  -- Link to a business whose owner_phone matches the last 10 digits
  UPDATE public.businesses b
  SET owner_user_id = _user_id,
      updated_at = now()
  WHERE b.owner_user_id IS NULL
    AND b.owner_phone IS NOT NULL
    AND regexp_replace(b.owner_phone, '[^0-9]', '', 'g') LIKE '%' || right(phone_clean, 10)
  RETURNING b.id INTO linked_business_id;

  IF linked_business_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'business')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_user_by_phone(uuid, text) TO authenticated;