-- Create rider_wallet_adjustments table
CREATE TABLE IF NOT EXISTS public.rider_wallet_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES public.riders(id),
    amount DECIMAL(10, 2) NOT NULL,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('cash_advance', 'bonus', 'deduction', 'settlement', 'correction')),
    reason TEXT NOT NULL,
    linked_order_id UUID REFERENCES public.orders(id),
    linked_rider_request_id UUID REFERENCES public.rider_requests(id),
    status TEXT NOT NULL CHECK (status IN ('active', 'settled', 'cancelled')) DEFAULT 'active',
    settled_at TIMESTAMPTZ,
    settled_by UUID REFERENCES auth.users(id),
    settled_notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for rider_wallet_adjustments
ALTER TABLE public.rider_wallet_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies for rider_wallet_adjustments
DROP POLICY IF EXISTS "Admins can view all wallet adjustments" ON public.rider_wallet_adjustments;
CREATE POLICY "Admins can view all wallet adjustments" 
ON public.rider_wallet_adjustments FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert wallet adjustments" ON public.rider_wallet_adjustments;
CREATE POLICY "Admins can insert wallet adjustments" 
ON public.rider_wallet_adjustments FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update wallet adjustments" ON public.rider_wallet_adjustments;
CREATE POLICY "Admins can update wallet adjustments" 
ON public.rider_wallet_adjustments FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Riders can view their own wallet adjustments" ON public.rider_wallet_adjustments;
CREATE POLICY "Riders can view their own wallet adjustments" 
ON public.rider_wallet_adjustments FOR SELECT 
TO authenticated 
USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));


-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES public.riders(id),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'paid')) DEFAULT 'pending',
    admin_notes TEXT,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ,
    payment_method TEXT,
    payment_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for withdrawal_requests
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Policies for withdrawal_requests
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admins can view all withdrawal requests" 
ON public.withdrawal_requests FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admins can update withdrawal requests" 
ON public.withdrawal_requests FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Riders can view their own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Riders can view their own withdrawal requests" 
ON public.withdrawal_requests FOR SELECT 
TO authenticated 
USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Riders can insert withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Riders can insert withdrawal requests" 
ON public.withdrawal_requests FOR INSERT 
TO authenticated 
WITH CHECK (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));


-- Create category_pricing table
CREATE TABLE IF NOT EXISTS public.category_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL UNIQUE,
    base_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    per_km_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
    min_payment DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for category_pricing
ALTER TABLE public.category_pricing ENABLE ROW LEVEL SECURITY;

-- Policies for category_pricing
DROP POLICY IF EXISTS "Everyone can view active category pricing" ON public.category_pricing;
CREATE POLICY "Everyone can view active category pricing" 
ON public.category_pricing FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Admins can manage category pricing" ON public.category_pricing;
CREATE POLICY "Admins can manage category pricing" 
ON public.category_pricing FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_rider_wallet_adjustments_updated_at ON public.rider_wallet_adjustments;
CREATE TRIGGER update_rider_wallet_adjustments_updated_at
    BEFORE UPDATE ON public.rider_wallet_adjustments
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_withdrawal_requests_updated_at ON public.withdrawal_requests;
CREATE TRIGGER update_withdrawal_requests_updated_at
    BEFORE UPDATE ON public.withdrawal_requests
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_category_pricing_updated_at ON public.category_pricing;
CREATE TRIGGER update_category_pricing_updated_at
    BEFORE UPDATE ON public.category_pricing
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

-- Function to create rider payment
CREATE OR REPLACE FUNCTION public.create_rider_payment(
  _order_id UUID DEFAULT NULL,
  _rider_request_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_rider_id UUID;
  v_distance DECIMAL := 0;
  v_settings RECORD;
  v_payment_id UUID;
  v_base_fee DECIMAL;
  v_per_km_rate DECIMAL;
  v_min_payment DECIMAL;
  v_amount DECIMAL;
  v_final_amount DECIMAL;
  v_pickup_lat DECIMAL;
  v_pickup_lng DECIMAL;
  v_delivery_lat DECIMAL;
  v_delivery_lng DECIMAL;
  v_pickup_address TEXT;
  v_dropoff_address TEXT;
BEGIN
  -- Validate inputs
  IF _order_id IS NULL AND _rider_request_id IS NULL THEN
    RAISE EXCEPTION 'Either order_id or rider_request_id must be provided';
  END IF;

  -- Check if payment already exists
  IF EXISTS (
    SELECT 1 FROM public.rider_payments 
    WHERE (order_id = _order_id AND _order_id IS NOT NULL)
       OR (rider_request_id = _rider_request_id AND _rider_request_id IS NOT NULL)
  ) THEN
    -- Return existing payment ID if it exists (idempotency)
    SELECT id INTO v_payment_id FROM public.rider_payments 
    WHERE (order_id = _order_id AND _order_id IS NOT NULL)
       OR (rider_request_id = _rider_request_id AND _rider_request_id IS NOT NULL);
    RETURN v_payment_id;
  END IF;

  -- Get Settings
  SELECT * INTO v_settings FROM public.rider_payment_settings WHERE is_active = true LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active payment settings found';
  END IF;

  v_base_fee := v_settings.base_fee;
  v_per_km_rate := v_settings.per_km_rate;
  v_min_payment := v_settings.min_payment;

  -- Get Data based on input
  IF _order_id IS NOT NULL THEN
    SELECT rider_id, pickup_lat, pickup_lng, delivery_lat, delivery_lng
    INTO v_rider_id, v_pickup_lat, v_pickup_lng, v_delivery_lat, v_delivery_lng
    FROM public.orders WHERE id = _order_id;
  ELSE
    SELECT rider_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng
    INTO v_rider_id, v_pickup_lat, v_pickup_lng, v_delivery_lat, v_delivery_lng
    FROM public.rider_requests WHERE id = _rider_request_id;
  END IF;

  if v_rider_id IS NULL THEN
    RAISE EXCEPTION 'Rider not assigned to this order/request';
  END IF;

  -- Calculate Distance (Simple Euclidean for now, or use PostGIS if available, but assuming basic postgres)
  -- 1 degree lat ~ 111 km. 
  -- d = R * c
  -- simplified: sqrt((lat2-lat1)^2 + (lng2-lng1)^2) * 111 (approx)
  IF v_pickup_lat IS NOT NULL AND v_delivery_lat IS NOT NULL THEN
     -- Improve distance calculation slightly
     -- distance = sqrt(dx^2 + dy^2) * 111.139
     v_distance := sqrt(power(v_delivery_lat - v_pickup_lat, 2) + power(v_delivery_lng - v_pickup_lng, 2)) * 111.139;
  END IF;

  -- Calculate amount
  v_amount := v_base_fee + (v_distance * v_per_km_rate);
  if v_amount < v_min_payment THEN
    v_amount := v_min_payment;
  END IF;

  v_final_amount := v_amount;

  -- Insert
  INSERT INTO public.rider_payments (
    rider_id, order_id, rider_request_id,
    distance_km, base_fee, per_km_rate,
    calculated_amount, final_amount, status,
    rider_lat, rider_lng, customer_lat, customer_lng
  ) VALUES (
    v_rider_id, _order_id, _rider_request_id,
    v_distance, v_base_fee, v_per_km_rate,
    v_amount, v_final_amount, 'pending',
    v_pickup_lat, v_pickup_lng, v_delivery_lat, v_delivery_lng
  ) RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
