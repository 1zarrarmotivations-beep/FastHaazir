-- ================================================
-- RIDER WALLET & WITHDRAWAL SYSTEM
-- ================================================

-- Create withdrawal requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT DEFAULT 'cash',
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on withdrawal_requests
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for withdrawal_requests
CREATE POLICY "Riders can view their own withdrawal requests"
  ON public.withdrawal_requests FOR SELECT
  USING (rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()));

CREATE POLICY "Riders can create withdrawal requests"
  ON public.withdrawal_requests FOR INSERT
  WITH CHECK (rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all withdrawal requests"
  ON public.withdrawal_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ================================================
-- CATEGORY PRICING TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS public.category_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  base_fee INTEGER NOT NULL DEFAULT 80,
  per_km_rate INTEGER NOT NULL DEFAULT 30,
  min_payment INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on category_pricing
ALTER TABLE public.category_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for category_pricing
CREATE POLICY "Anyone can view active category pricing"
  ON public.category_pricing FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage category pricing"
  ON public.category_pricing FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default category pricing
INSERT INTO public.category_pricing (category, base_fee, per_km_rate, min_payment) VALUES
  ('food', 80, 30, 100),
  ('grocery', 100, 25, 120),
  ('bakery', 80, 28, 100),
  ('medical', 120, 35, 150),
  ('parcel', 100, 30, 120),
  ('self_delivery', 60, 25, 80)
ON CONFLICT (category) DO NOTHING;

-- ================================================
-- ENHANCE RIDER_PAYMENTS TABLE
-- ================================================

-- Add pickup_km and delivery_km columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rider_payments' AND column_name = 'pickup_km') THEN
    ALTER TABLE public.rider_payments ADD COLUMN pickup_km NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rider_payments' AND column_name = 'delivery_km') THEN
    ALTER TABLE public.rider_payments ADD COLUMN delivery_km NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rider_payments' AND column_name = 'category') THEN
    ALTER TABLE public.rider_payments ADD COLUMN category TEXT DEFAULT 'food';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rider_payments' AND column_name = 'pickup_lat') THEN
    ALTER TABLE public.rider_payments ADD COLUMN pickup_lat NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rider_payments' AND column_name = 'pickup_lng') THEN
    ALTER TABLE public.rider_payments ADD COLUMN pickup_lng NUMERIC;
  END IF;
END $$;

-- ================================================
-- ENHANCED PAYMENT SETTINGS
-- ================================================

-- Add new columns to rider_payment_settings if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rider_payment_settings' AND column_name = 'max_delivery_radius_km') THEN
    ALTER TABLE public.rider_payment_settings ADD COLUMN max_delivery_radius_km INTEGER DEFAULT 15;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rider_payment_settings' AND column_name = 'min_order_value') THEN
    ALTER TABLE public.rider_payment_settings ADD COLUMN min_order_value INTEGER DEFAULT 200;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rider_payment_settings' AND column_name = 'rider_base_earning') THEN
    ALTER TABLE public.rider_payment_settings ADD COLUMN rider_base_earning INTEGER DEFAULT 50;
  END IF;
END $$;

-- ================================================
-- ENABLE REALTIME
-- ================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.category_pricing;

-- ================================================
-- TRIGGERS
-- ================================================

-- Update updated_at trigger for withdrawal_requests
CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update updated_at trigger for category_pricing
CREATE TRIGGER update_category_pricing_updated_at
  BEFORE UPDATE ON public.category_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();