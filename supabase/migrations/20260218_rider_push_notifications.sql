-- Advanced Rider Push Notifications System
-- This creates the infrastructure for sending push notifications to riders when new orders arrive
-- Works even when the app is closed/backgrounded

-- 1. Add FCM token column to riders table if not exists
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- 2. Create notification log table
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    rider_id UUID REFERENCES public.riders(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification logs
DROP POLICY IF EXISTS "Admins full access to notification logs" ON public.push_notification_logs;
CREATE POLICY "Admins full access to notification logs" ON public.push_notification_logs
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Create function to find available riders and notify them
CREATE OR REPLACE FUNCTION notify_available_riders()
RETURNS TRIGGER AS $$
DECLARE
    rider_record RECORD;
    notification_title TEXT;
    notification_body TEXT;
BEGIN
    -- Set notification content based on order type
    IF NEW.type = 'rider_request' THEN
        notification_title := '🚗 New Delivery Request!';
        notification_body := 'Pickup: ' || LEFT(NEW.pickup_address, 50) || '... - Earn: Rs ' || COALESCE(NEW.rider_earning::TEXT, NEW.total::TEXT);
    ELSE
        notification_title := '🍔 New Order!';
        notification_body := 'New order received - Rs ' || NEW.total::TEXT;
    END IF;

    -- Find all online and active riders
    FOR rider_record IN 
        SELECT id, user_id, name, fcm_token 
        FROM public.riders 
        WHERE is_online = true 
        AND is_active = true 
        AND verification_status = 'verified'
    LOOP
        -- Log the notification (for tracking)
        INSERT INTO public.push_notification_logs (order_id, rider_id, title, body, status)
        VALUES (NEW.id, rider_record.id, notification_title, notification_body, 'pending');

        -- Note: Actual push notification sending would be done by an Edge Function
        -- This trigger logs the intent to send notifications
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger on rider_requests table
DROP TRIGGER IF EXISTS trigger_notify_riders_on_new_request ON public.rider_requests;
CREATE TRIGGER trigger_notify_riders_on_new_request
    AFTER INSERT ON public.rider_requests
    FOR EACH ROW
    WHEN (NEW.status = 'pending' OR NEW.status IS NULL)
    EXECUTE FUNCTION notify_available_riders();

-- 5. Create trigger on orders table for business orders
DROP TRIGGER IF EXISTS trigger_notify_riders_on_new_order ON public.orders;
CREATE TRIGGER trigger_notify_riders_on_new_order
    AFTER INSERT ON public.orders
    FOR EACH ROW
    WHEN (NEW.status = 'pending' OR NEW.status = 'placed')
    EXECUTE FUNCTION notify_available_riders();

-- 6. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_order ON public.push_notification_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_rider ON public.push_notification_logs(rider_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_status ON public.push_notification_logs(status);

-- 7. Add notification settings for riders (can opt out)
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS vibration_enabled BOOLEAN DEFAULT true;

COMMENT ON TABLE public.push_notification_logs IS 'Logs all push notification attempts to riders';
