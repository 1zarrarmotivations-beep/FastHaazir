-- ================================================================
-- FIX 1: Update Rider INSERT policy to require sender_id = auth.uid()
-- ================================================================

-- Drop the old rider INSERT policy that's missing sender_id validation
DROP POLICY IF EXISTS "Riders can send messages for assigned orders" ON public.chat_messages;

-- Create corrected rider INSERT policy with sender_id = auth.uid()
CREATE POLICY "Riders can send messages for assigned orders"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_type = 'rider'
  AND sender_id = auth.uid()
  AND (
    -- For regular orders
    (order_id IS NOT NULL AND order_id IN (
      SELECT o.id FROM orders o
      WHERE o.rider_id IN (
        SELECT r.id FROM riders r WHERE r.user_id = auth.uid()
      )
    ))
    OR
    -- For rider requests
    (rider_request_id IS NOT NULL AND rider_request_id IN (
      SELECT rr.id FROM rider_requests rr
      WHERE rr.rider_id IN (
        SELECT r.id FROM riders r WHERE r.user_id = auth.uid()
      )
    ))
  )
);

-- ================================================================
-- FIX 2: Update Business INSERT policy to require sender_id = auth.uid()
-- ================================================================

-- Drop the old business INSERT policy
DROP POLICY IF EXISTS "Business can send order messages" ON public.chat_messages;

-- Create corrected business INSERT policy with sender_id = auth.uid()
CREATE POLICY "Business can send order messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_type = 'business'
  AND sender_id = auth.uid()
  AND order_id IN (
    SELECT o.id
    FROM orders o
    JOIN businesses b ON o.business_id = b.id
    WHERE b.owner_user_id = auth.uid()
  )
);

-- ================================================================
-- FIX 3: Replace resolve_role_by_phone to remove hardcoded admin override
-- ================================================================

CREATE OR REPLACE FUNCTION public.resolve_role_by_phone(_phone text)
 RETURNS TABLE(role text, is_blocked boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  phone_norm text;
  _id uuid;
  _user_id uuid;
  _is_active boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  phone_norm := public.normalize_pk_phone_digits(_phone);

  IF phone_norm IS NULL THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  -- NOTE: Admin phone override REMOVED. 
  -- Admins must be added via the admins table by an existing admin.

  -- 1) Check admins table - ONLY if already exists
  SELECT a.id, a.user_id, a.is_active
    INTO _id, _user_id, _is_active
  FROM public.admins a
  WHERE public.normalize_pk_phone_digits(a.phone) = phone_norm
  LIMIT 1;

  IF FOUND THEN
    -- Only allow access if unclaimed or owned by this user
    IF _user_id IS NULL OR _user_id = _uid THEN
      UPDATE public.admins
        SET user_id = COALESCE(user_id, _uid),
            phone = phone_norm,
            updated_at = now()
      WHERE id = _id
        AND (user_id IS NULL OR user_id = _uid);

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'admin'::app_role)
      ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

      RETURN QUERY SELECT 'admin'::text, (COALESCE(_is_active, true) = false);
      RETURN;
    ELSE
      -- Phone exists but claimed by different user - deny access
      RAISE EXCEPTION 'phone_already_claimed';
    END IF;
  END IF;

  -- 2) Check riders table - ONLY if already claimed by this user
  SELECT r.id, r.user_id, r.is_active
    INTO _id, _user_id, _is_active
  FROM public.riders r
  WHERE public.normalize_pk_phone_digits(r.phone) = phone_norm
  LIMIT 1;

  IF FOUND THEN
    -- Only allow access if unclaimed or owned by this user
    IF _user_id IS NULL OR _user_id = _uid THEN
      UPDATE public.riders
        SET user_id = COALESCE(user_id, _uid),
            claimed = true,
            phone = phone_norm,
            updated_at = now()
      WHERE id = _id
        AND (user_id IS NULL OR user_id = _uid);

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'rider'::app_role)
      ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

      RETURN QUERY SELECT 'rider'::text, (COALESCE(_is_active, true) = false);
      RETURN;
    ELSE
      -- Phone exists but claimed by different user - deny access
      RAISE EXCEPTION 'phone_already_claimed';
    END IF;
  END IF;

  -- 3) Check businesses table - ONLY if already claimed by this user
  SELECT b.id, b.owner_user_id, b.is_active
    INTO _id, _user_id, _is_active
  FROM public.businesses b
  WHERE public.normalize_pk_phone_digits(b.owner_phone) = phone_norm
  LIMIT 1;

  IF FOUND THEN
    -- Only allow access if unclaimed or owned by this user
    IF _user_id IS NULL OR _user_id = _uid THEN
      UPDATE public.businesses
        SET owner_user_id = COALESCE(owner_user_id, _uid),
            claimed = true,
            owner_phone = phone_norm,
            updated_at = now()
      WHERE id = _id
        AND (owner_user_id IS NULL OR owner_user_id = _uid);

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'business'::app_role)
      ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

      RETURN QUERY SELECT 'business'::text, (COALESCE(_is_active, true) = false);
      RETURN;
    ELSE
      -- Phone exists but claimed by different user - deny access
      RAISE EXCEPTION 'phone_already_claimed';
    END IF;
  END IF;

  -- 4) No matching role found - create customer profile
  INSERT INTO public.customer_profiles (user_id, name)
  VALUES (_uid, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'customer'::app_role)
  ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

  RETURN QUERY SELECT 'customer'::text, false;
END;
$function$;