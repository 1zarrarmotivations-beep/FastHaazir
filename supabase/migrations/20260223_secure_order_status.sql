-- Migration: 202602230300_secure_order_status.sql
-- Description: Task 5 - Server-side validation for order completion (100m proximity check)

-- Create audit_logs table if not exists (needed for status change tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_value JSONB,
    new_value JSONB,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries on audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE OR REPLACE FUNCTION public.secure_update_order_status(
  p_id uuid,
  p_new_status text,
  p_rider_id uuid,
  p_type text DEFAULT 'order'
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target_lat numeric;
  v_target_lng numeric;
  v_rider_lat numeric;
  v_rider_lng numeric;
  v_current_status text;
  v_distance numeric;
  v_radius numeric := 6371000; -- Earth radius in meters
  v_dlat numeric;
  v_dlng numeric;
  v_a numeric;
  v_c numeric;
BEGIN
  -- 1. Authorization check: Is the rider assigned to this order?
  IF p_type = 'order' THEN
    SELECT status, delivery_lat, delivery_lng 
    INTO v_current_status, v_target_lat, v_target_lng
    FROM public.orders
    WHERE id = p_id AND rider_id = p_rider_id;
  ELSE
    SELECT status, dropoff_lat, dropoff_lng 
    INTO v_current_status, v_target_lat, v_target_lng
    FROM public.rider_requests
    WHERE id = p_id AND rider_id = p_rider_id;
  END IF;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found or not assigned to you');
  END IF;

  -- 2. Proximity check for delivery completion
  IF p_new_status = 'delivered' THEN
    SELECT current_location_lat, current_location_lng 
    INTO v_rider_lat, v_rider_lng
    FROM public.riders
    WHERE id = p_rider_id;

    IF v_rider_lat IS NOT NULL AND v_rider_lng IS NOT NULL AND v_target_lat IS NOT NULL AND v_target_lng IS NOT NULL THEN
      -- Haversine Formula
      v_dlat := radians(v_target_lat - v_rider_lat);
      v_dlng := radians(v_target_lng - v_rider_lng);
      v_a := sin(v_dlat/2) * sin(v_dlat/2) + cos(radians(v_rider_lat)) * cos(radians(v_target_lat)) * sin(v_dlng/2) * sin(v_dlng/2);
      v_c := 2 * atan2(sqrt(v_a), sqrt(1-v_a));
      v_distance := v_radius * v_c;

      -- 100 meter threshold
      IF v_distance > 100 THEN
        RETURN jsonb_build_object(
          'success', false, 
          'error', format('Distance too far (%s meters). You must be within 100m of the dropoff location.', round(v_distance)),
          'distance_meters', round(v_distance)
        );
      END IF;
    END IF;
  END IF;

  -- 3. Perform update
  IF p_type = 'order' THEN
    UPDATE public.orders
    SET 
      status = p_new_status,
      completed_at = CASE WHEN p_new_status = 'delivered' THEN now() ELSE completed_at END,
      updated_at = now()
    WHERE id = p_id;
  ELSE
    UPDATE public.rider_requests
    SET 
      status = p_new_status,
      updated_at = now()
    WHERE id = p_id;
  END IF;

  -- 4. Audit Log (Task 5 requirement for traceability)
  INSERT INTO public.audit_logs (action, entity_type, entity_id, old_value, new_value, user_id)
  VALUES (
    'status_update', 
    p_type, 
    p_id, 
    jsonb_build_object('status', v_current_status), 
    jsonb_build_object('status', p_new_status), 
    (SELECT user_id FROM public.riders WHERE id = p_rider_id)
  );

  RETURN jsonb_build_object('success', true, 'status', p_new_status);
END;
$$;
