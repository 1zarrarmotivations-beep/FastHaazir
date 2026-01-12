-- Fix 1: Add missing SELECT policy for customer_profiles to block anon access
-- (Table already has correct RLS policies for authenticated users, but we need to ensure anon can't access)
-- The current policies are fine - they restrict to auth.uid() = user_id

-- Fix 2: Block anonymous/public SELECT on chat_messages
-- Ensure only authenticated users with proper relationship can read
-- The current policies require auth.uid() checks, but let's add explicit anon blocking
-- Actually the policies look correct - they use auth.uid() which is null for anon users

-- Fix 3: Fix rider_payments INSERT policy - restrict to validated inserts only
DROP POLICY IF EXISTS "System can insert payments" ON public.rider_payments;

-- Create secure function for rider payment creation
CREATE OR REPLACE FUNCTION public.create_rider_payment(
  _order_id uuid DEFAULT NULL,
  _rider_request_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rider_id uuid;
  _rider_lat numeric;
  _rider_lng numeric;
  _customer_lat numeric;
  _customer_lng numeric;
  _pickup_lat numeric;
  _pickup_lng numeric;
  _distance_km numeric;
  _calculated_amount integer;
  _settings RECORD;
  _payment_id uuid;
BEGIN
  -- Get rider ID for authenticated user
  SELECT id, current_location_lat, current_location_lng 
  INTO _rider_id, _rider_lat, _rider_lng 
  FROM riders WHERE user_id = auth.uid();
  
  IF _rider_id IS NULL THEN
    RAISE EXCEPTION 'not_a_rider';
  END IF;
  
  -- Verify rider is assigned to order/request and get coordinates
  IF _order_id IS NOT NULL THEN
    -- Check for existing payment
    IF EXISTS (SELECT 1 FROM rider_payments WHERE order_id = _order_id) THEN
      RAISE EXCEPTION 'payment_already_exists';
    END IF;
    
    SELECT delivery_lat, delivery_lng, pickup_lat, pickup_lng
    INTO _customer_lat, _customer_lng, _pickup_lat, _pickup_lng
    FROM orders
    WHERE id = _order_id AND rider_id = _rider_id AND status = 'delivered';
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'order_not_assigned_or_not_delivered';
    END IF;
  ELSIF _rider_request_id IS NOT NULL THEN
    -- Check for existing payment
    IF EXISTS (SELECT 1 FROM rider_payments WHERE rider_request_id = _rider_request_id) THEN
      RAISE EXCEPTION 'payment_already_exists';
    END IF;
    
    SELECT dropoff_lat, dropoff_lng, pickup_lat, pickup_lng
    INTO _customer_lat, _customer_lng, _pickup_lat, _pickup_lng
    FROM rider_requests
    WHERE id = _rider_request_id AND rider_id = _rider_id AND status = 'delivered';
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'request_not_assigned_or_not_delivered';
    END IF;
  ELSE
    RAISE EXCEPTION 'order_or_request_required';
  END IF;
  
  -- Get active payment settings
  SELECT * INTO _settings FROM rider_payment_settings WHERE is_active = true LIMIT 1;
  
  IF _settings IS NULL THEN
    -- Use defaults if no settings
    _settings.base_fee := 50;
    _settings.per_km_rate := 15;
    _settings.min_payment := 50;
  END IF;
  
  -- Calculate distance using Haversine formula (server-side)
  -- Use pickup and customer coordinates
  IF _pickup_lat IS NOT NULL AND _pickup_lng IS NOT NULL 
     AND _customer_lat IS NOT NULL AND _customer_lng IS NOT NULL THEN
    _distance_km := 6371 * acos(
      cos(radians(_pickup_lat)) * cos(radians(_customer_lat)) *
      cos(radians(_customer_lng) - radians(_pickup_lng)) +
      sin(radians(_pickup_lat)) * sin(radians(_customer_lat))
    );
  ELSE
    _distance_km := 0;
  END IF;
  
  -- Ensure reasonable distance
  _distance_km := LEAST(GREATEST(_distance_km, 0), 500);
  
  -- Calculate payment amount
  _calculated_amount := _settings.base_fee + (_distance_km * _settings.per_km_rate);
  _calculated_amount := GREATEST(_calculated_amount, _settings.min_payment);
  
  -- Insert payment record
  INSERT INTO rider_payments (
    rider_id, order_id, rider_request_id,
    distance_km, base_fee, per_km_rate,
    calculated_amount, final_amount,
    rider_lat, rider_lng, customer_lat, customer_lng,
    status
  ) VALUES (
    _rider_id, _order_id, _rider_request_id,
    _distance_km, _settings.base_fee, _settings.per_km_rate,
    _calculated_amount, _calculated_amount,
    _rider_lat, _rider_lng, _customer_lat, _customer_lng,
    'pending'
  ) RETURNING id INTO _payment_id;
  
  RETURN _payment_id;
END;
$$;

-- Fix 4: Update send_system_notification to require admin role
CREATE OR REPLACE FUNCTION public.send_system_notification(
  _title text,
  _message text,
  _user_ids uuid[] DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- SECURITY: Require admin role
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  -- If user_ids is provided, send to those specific users
  IF _user_ids IS NOT NULL THEN
    FOREACH target_user_id IN ARRAY _user_ids LOOP
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (target_user_id, _title, _message, 'system');
    END LOOP;
  ELSE
    -- Send to all users with 'customer' role
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT ur.user_id, _title, _message, 'system'
    FROM public.user_roles ur
    WHERE ur.role = 'customer';
  END IF;
END;
$$;

-- Fix 5: Replace permissive notifications INSERT policy with restrictive one
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create secure function for creating notifications with proper authorization
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _title text,
  _message text,
  _type text DEFAULT 'general',
  _order_id uuid DEFAULT NULL,
  _rider_request_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _notification_id uuid;
  _caller_rider_id uuid;
BEGIN
  -- SECURITY: Validate authorization based on notification type
  
  -- Admins can create any notification
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    -- Admin is authorized
    NULL;
  -- Users can only create notifications for themselves
  ELSIF auth.uid() = _user_id THEN
    -- Self-notification is allowed
    NULL;
  -- Riders can notify customers for their assigned orders
  ELSIF _order_id IS NOT NULL THEN
    SELECT r.id INTO _caller_rider_id FROM riders r WHERE r.user_id = auth.uid();
    IF _caller_rider_id IS NULL THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM orders 
      WHERE id = _order_id 
        AND rider_id = _caller_rider_id 
        AND customer_id = _user_id
    ) THEN
      RAISE EXCEPTION 'not_authorized_for_order';
    END IF;
  -- Riders can notify customers for their assigned requests
  ELSIF _rider_request_id IS NOT NULL THEN
    SELECT r.id INTO _caller_rider_id FROM riders r WHERE r.user_id = auth.uid();
    IF _caller_rider_id IS NULL THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM rider_requests 
      WHERE id = _rider_request_id 
        AND rider_id = _caller_rider_id 
        AND customer_id = _user_id
    ) THEN
      RAISE EXCEPTION 'not_authorized_for_request';
    END IF;
  ELSE
    RAISE EXCEPTION 'not_authorized';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, order_id, rider_request_id)
  VALUES (_user_id, _title, _message, _type, _order_id, _rider_request_id)
  RETURNING id INTO _notification_id;
  
  RETURN _notification_id;
END;
$$;

-- Add unique constraints to prevent duplicate payments
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_order_payment 
ON rider_payments(order_id) WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_request_payment 
ON rider_payments(rider_request_id) WHERE rider_request_id IS NOT NULL;