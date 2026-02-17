-- Migration: Backend adjustments for account deletion and privacy fixes
-- Date: 2026-02-20

-- 1. Create Deletion Requests Table
CREATE TABLE IF NOT EXISTS public.deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on deletion_requests
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policies for deletion_requests
CREATE POLICY "Users can create their own deletion requests" 
ON public.deletion_requests FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own deletion requests" 
ON public.deletion_requests FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all deletion requests" 
ON public.deletion_requests FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- 2. Enhanced Privacy: Allow Riders to see customer NAMES only
-- This is needed for joins in Rider Dashboard where they need to know WHO they are delivering to
-- but shouldn't see sensitive info like phone/email directly unless through admin or specific business logic.

DROP POLICY IF EXISTS "Riders can view customer names for assigned orders" ON public.customer_profiles;
CREATE POLICY "Riders can view customer names for assigned orders" 
ON public.customer_profiles FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE (orders.customer_id = customer_profiles.user_id) 
        AND (orders.rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()))
    )
    OR 
    EXISTS (
        SELECT 1 FROM public.rider_requests 
        WHERE (rider_requests.customer_id = customer_profiles.user_id) 
        AND (rider_requests.rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()))
    )
);

-- 3. Add updated_at trigger for deletion_requests
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_deletion_requests_updated_at ON public.deletion_requests;
CREATE TRIGGER set_deletion_requests_updated_at
    BEFORE UPDATE ON public.deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Mark customer profiles for deletion (optional helper)
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS is_deletion_pending BOOLEAN DEFAULT false;

COMMENT ON TABLE public.deletion_requests IS 'Stores user requests for account and data deletion as per Play Store requirements';
