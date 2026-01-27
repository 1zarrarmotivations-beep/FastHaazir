-- Create rider_wallet_adjustments table for cash advances and manual credits
CREATE TABLE public.rider_wallet_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  adjustment_type TEXT NOT NULL DEFAULT 'cash_advance',
  reason TEXT NOT NULL,
  linked_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  linked_rider_request_id UUID REFERENCES public.rider_requests(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  settled_at TIMESTAMP WITH TIME ZONE,
  settled_by UUID,
  settled_notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_adjustment_type CHECK (adjustment_type IN ('cash_advance', 'bonus', 'deduction', 'settlement', 'correction')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'settled', 'cancelled'))
);

-- Create index for faster lookups
CREATE INDEX idx_rider_wallet_adjustments_rider_id ON public.rider_wallet_adjustments(rider_id);
CREATE INDEX idx_rider_wallet_adjustments_status ON public.rider_wallet_adjustments(status);
CREATE INDEX idx_rider_wallet_adjustments_type ON public.rider_wallet_adjustments(adjustment_type);

-- Enable RLS
ALTER TABLE public.rider_wallet_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all wallet adjustments"
  ON public.rider_wallet_adjustments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Riders can view their own wallet adjustments"
  ON public.rider_wallet_adjustments FOR SELECT
  USING (rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()));

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_wallet_adjustments;

-- Add updated_at trigger
CREATE TRIGGER update_rider_wallet_adjustments_updated_at
  BEFORE UPDATE ON public.rider_wallet_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();