-- Add rider_request_id to payments table
-- This allows payments for both orders AND rider requests (delivery services)

ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS rider_request_id UUID REFERENCES public.rider_requests(id) ON DELETE CASCADE;

-- Make order_id nullable since we now support rider_request_id
ALTER TABLE public.payments ALTER COLUMN order_id DROP NOT NULL;

-- Add CHECK constraint to ensure at least one of order_id or rider_request_id is provided
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_order_id_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_order_or_rider_request 
CHECK (order_id IS NOT NULL OR rider_request_id IS NOT NULL);

-- Create indexes for faster lookups on rider_request_id
CREATE INDEX IF NOT EXISTS idx_payments_rider_request_id ON public.payments(rider_request_id);

COMMENT ON COLUMN public.payments.rider_request_id IS 'UUID reference to rider_requests table for delivery payments';
