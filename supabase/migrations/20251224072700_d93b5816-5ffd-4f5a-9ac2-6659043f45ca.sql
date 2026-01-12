-- Create rider payment settings table (admin configurable)
CREATE TABLE public.rider_payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_fee INTEGER NOT NULL DEFAULT 80,
  per_km_rate INTEGER NOT NULL DEFAULT 30,
  min_payment INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rider payments table
CREATE TABLE public.rider_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid REFERENCES public.riders(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rider_request_id uuid REFERENCES public.rider_requests(id) ON DELETE SET NULL,
  distance_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  base_fee INTEGER NOT NULL DEFAULT 80,
  per_km_rate INTEGER NOT NULL DEFAULT 30,
  calculated_amount INTEGER NOT NULL DEFAULT 0,
  bonus INTEGER DEFAULT 0,
  penalty INTEGER DEFAULT 0,
  final_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'paid')),
  rider_lat NUMERIC(10,6),
  rider_lng NUMERIC(10,6),
  customer_lat NUMERIC(10,6),
  customer_lng NUMERIC(10,6),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT order_or_request CHECK (order_id IS NOT NULL OR rider_request_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.rider_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_payments ENABLE ROW LEVEL SECURITY;

-- RLS for rider_payment_settings
CREATE POLICY "Anyone can view active payment settings"
ON public.rider_payment_settings FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage payment settings"
ON public.rider_payment_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for rider_payments
CREATE POLICY "Riders can view their own payments"
ON public.rider_payments FOR SELECT
USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all payments"
ON public.rider_payments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert payments"
ON public.rider_payments FOR INSERT
WITH CHECK (true);

-- Insert default payment settings
INSERT INTO public.rider_payment_settings (base_fee, per_km_rate, min_payment)
VALUES (80, 30, 100);

-- Create trigger for updated_at
CREATE TRIGGER update_rider_payment_settings_updated_at
BEFORE UPDATE ON public.rider_payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rider_payments_updated_at
BEFORE UPDATE ON public.rider_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for rider_payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_payments;