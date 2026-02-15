-- Fix RLS policies for rider_wallet_adjustments table
-- This ensures the Cash Advances page works properly in admin panel

-- Enable RLS if not already enabled
ALTER TABLE public.rider_wallet_adjustments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Admins have full access to wallet adjustments" ON public.rider_wallet_adjustments;
DROP POLICY IF EXISTS "Riders can view own adjustments" ON public.rider_wallet_adjustments;
DROP POLICY IF EXISTS "Service role full access to wallet adjustments" ON public.rider_wallet_adjustments;

-- 1. Admins have full access to all wallet adjustments
CREATE POLICY "Admins have full access to wallet adjustments"
ON public.rider_wallet_adjustments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Service role bypass (for backend operations)
CREATE POLICY "Service role full access to wallet adjustments"
ON public.rider_wallet_adjustments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Riders can view their own adjustments (read-only)
CREATE POLICY "Riders can view own adjustments"
ON public.rider_wallet_adjustments
FOR SELECT
TO authenticated
USING (rider_id = auth.uid());

-- 4. Allow insert for admins (they create adjustments)
CREATE POLICY "Admins can insert wallet adjustments"
ON public.rider_wallet_adjustments
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Allow update for admins
CREATE POLICY "Admins can update wallet adjustments"
ON public.rider_wallet_adjustments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_wallet_adjustments_rider_id ON public.rider_wallet_adjustments(rider_id);
CREATE INDEX IF NOT EXISTS idx_wallet_adjustments_status ON public.rider_wallet_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_wallet_adjustments_type ON public.rider_wallet_adjustments(adjustment_type);

COMMENT ON TABLE public.rider_wallet_adjustments IS 'Cash advances, bonuses, and deductions for riders';
