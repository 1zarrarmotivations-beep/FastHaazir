-- Add location fields to businesses table for precise pickup points
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS location_lat NUMERIC,
ADD COLUMN IF NOT EXISTS location_lng NUMERIC,
ADD COLUMN IF NOT EXISTS location_address TEXT;

-- Add delivery OTP fields to orders table for secure delivery verification
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_otp TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add delivery OTP fields to rider_requests table
ALTER TABLE public.rider_requests 
ADD COLUMN IF NOT EXISTS delivery_otp TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Function to generate a random 4-digit OTP
CREATE OR REPLACE FUNCTION public.generate_delivery_otp()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$;

-- Trigger to auto-generate OTP when order is placed
CREATE OR REPLACE FUNCTION public.auto_generate_order_otp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate OTP for new orders
  IF NEW.delivery_otp IS NULL AND NEW.status = 'placed' THEN
    NEW.delivery_otp := public.generate_delivery_otp();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for orders
DROP TRIGGER IF EXISTS trigger_auto_order_otp ON public.orders;
CREATE TRIGGER trigger_auto_order_otp
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_order_otp();

-- Create trigger for rider_requests
DROP TRIGGER IF EXISTS trigger_auto_rider_request_otp ON public.rider_requests;
CREATE TRIGGER trigger_auto_rider_request_otp
  BEFORE INSERT ON public.rider_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_order_otp();

-- Function to verify delivery OTP
CREATE OR REPLACE FUNCTION public.verify_delivery_otp(
  _order_id UUID DEFAULT NULL,
  _rider_request_id UUID DEFAULT NULL,
  _otp TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rider_id UUID;
  _stored_otp TEXT;
  _already_verified BOOLEAN;
BEGIN
  -- Get rider ID for authenticated user
  SELECT id INTO _rider_id FROM riders WHERE user_id = auth.uid();
  
  IF _rider_id IS NULL THEN
    RAISE EXCEPTION 'not_a_rider';
  END IF;
  
  -- Verify OTP for order
  IF _order_id IS NOT NULL THEN
    SELECT delivery_otp, otp_verified INTO _stored_otp, _already_verified
    FROM orders
    WHERE id = _order_id AND rider_id = _rider_id AND status = 'on_way';
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'order_not_assigned_or_not_on_way';
    END IF;
    
    IF _already_verified THEN
      RETURN TRUE; -- Already verified
    END IF;
    
    IF _stored_otp = _otp THEN
      UPDATE orders SET 
        otp_verified = TRUE,
        otp_verified_at = NOW()
      WHERE id = _order_id;
      RETURN TRUE;
    END IF;
    
    RETURN FALSE;
  END IF;
  
  -- Verify OTP for rider_request
  IF _rider_request_id IS NOT NULL THEN
    SELECT delivery_otp, otp_verified INTO _stored_otp, _already_verified
    FROM rider_requests
    WHERE id = _rider_request_id AND rider_id = _rider_id AND status = 'on_way';
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'request_not_assigned_or_not_on_way';
    END IF;
    
    IF _already_verified THEN
      RETURN TRUE; -- Already verified
    END IF;
    
    IF _stored_otp = _otp THEN
      UPDATE rider_requests SET 
        otp_verified = TRUE,
        otp_verified_at = NOW()
      WHERE id = _rider_request_id;
      RETURN TRUE;
    END IF;
    
    RETURN FALSE;
  END IF;
  
  RAISE EXCEPTION 'order_or_request_id_required';
END;
$$;

-- Update the sync trigger to include new business fields
CREATE OR REPLACE FUNCTION public.sync_public_businesses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.public_businesses WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.public_businesses (
    id,
    name,
    type,
    image,
    rating,
    eta,
    distance,
    category,
    description,
    featured,
    is_active,
    is_approved,
    deleted_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.name,
    NEW.type,
    NEW.image,
    NEW.rating,
    NEW.eta,
    NEW.distance,
    NEW.category,
    NEW.description,
    COALESCE(NEW.featured, false),
    COALESCE(NEW.is_active, true),
    COALESCE(NEW.is_approved, true),
    NEW.deleted_at,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    image = EXCLUDED.image,
    rating = EXCLUDED.rating,
    eta = EXCLUDED.eta,
    distance = EXCLUDED.distance,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    featured = EXCLUDED.featured,
    is_active = EXCLUDED.is_active,
    is_approved = EXCLUDED.is_approved,
    deleted_at = EXCLUDED.deleted_at,
    updated_at = now();

  RETURN NEW;
END;
$$;