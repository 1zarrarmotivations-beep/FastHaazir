-- Migration: Add order tracking columns to riders table
-- Required for scheduled order auto-assignment

-- Add current_orders_count column to track active orders per rider
ALTER TABLE public.riders 
ADD COLUMN IF NOT EXISTS current_orders_count INTEGER DEFAULT 0;

-- Ensure latitude/longitude columns exist for rider location tracking
ALTER TABLE public.riders 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);

ALTER TABLE public.riders 
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);

-- Create index for finding nearby riders
CREATE INDEX IF NOT EXISTS idx_riders_location 
ON public.riders(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create index for finding available riders
CREATE INDEX IF NOT EXISTS idx_riders_available 
ON public.riders(is_active, is_online, verification_status) 
WHERE is_active = true AND is_online = true AND verification_status = 'verified';

-- Create index for scheduled_orders to find orders ready for assignment
CREATE INDEX IF NOT EXISTS idx_scheduled_orders_ready 
ON public.scheduled_orders(status, scheduled_datetime) 
WHERE status = 'pending';

-- Add notification table for rider notifications (if not exists)
CREATE TABLE IF NOT EXISTS public.rider_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rider_id UUID REFERENCES public.riders(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on rider_notifications
ALTER TABLE public.rider_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Riders can view their own notifications
DROP POLICY IF EXISTS "Riders can view own notifications" ON public.rider_notifications;
CREATE POLICY "Riders can view own notifications" 
ON public.rider_notifications FOR SELECT 
USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

-- Policy: System can insert notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.rider_notifications;
CREATE POLICY "System can insert notifications" 
ON public.rider_notifications FOR INSERT 
WITH CHECK (true);

-- Policy: Riders can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Riders can update own notifications" ON public.rider_notifications;
CREATE POLICY "Riders can update own notifications" 
ON public.rider_notifications FOR UPDATE 
USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

COMMENT ON COLUMN public.riders.current_orders_count IS 'Current number of active orders assigned to the rider';
COMMENT ON COLUMN public.riders.latitude IS 'Current latitude of rider location';
COMMENT ON COLUMN public.riders.longitude IS 'Current longitude of rider location';
