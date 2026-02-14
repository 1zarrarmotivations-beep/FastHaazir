
-- Fix schema for Finance Module and Rider implementation

-- 1. Add missing image column to riders table
ALTER TABLE public.riders 
ADD COLUMN IF NOT EXISTS image TEXT;

-- 2. Add missing columns to rider_payments table
ALTER TABLE public.rider_payments
ADD COLUMN IF NOT EXISTS rider_request_id UUID REFERENCES public.rider_requests(id),
ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS base_fee DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS per_km_rate DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS calculated_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS final_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS rider_lat DECIMAL,
ADD COLUMN IF NOT EXISTS rider_lng DECIMAL,
ADD COLUMN IF NOT EXISTS customer_lat DECIMAL,
ADD COLUMN IF NOT EXISTS customer_lng DECIMAL;

-- 3. Backfill final_amount from amount for existing records if needed
UPDATE public.rider_payments 
SET final_amount = amount 
WHERE final_amount IS NULL AND amount IS NOT NULL;

-- 4. Create missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_rider_payments_rider_id ON public.rider_payments(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_payments_status ON public.rider_payments(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_rider_id ON public.withdrawal_requests(rider_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(status);
