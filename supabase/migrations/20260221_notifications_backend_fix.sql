-- Migration: Notifications Backend Fix
-- Aligning triggers with v2 push system and fixing status mismatches
-- Date: 2026-02-21

-- 1. Update notify_available_riders function to use v2 tables
CREATE OR REPLACE FUNCTION public.notify_available_riders()
RETURNS TRIGGER AS $$
DECLARE
    rider_record RECORD;
    notif_title TEXT;
    notif_body TEXT;
BEGIN
    -- Determine Title and Body based on table
    IF TG_TABLE_NAME = 'rider_requests' THEN
        notif_title := '📦 New Direct Mission!';
        notif_body := 'New delivery request from ' || COALESCE(NEW.pickup_address, 'Customer');
    ELSIF TG_TABLE_NAME = 'orders' THEN
        notif_title := '🍔 New Business Order!';
        notif_body := 'New order available at ' || COALESCE((SELECT name FROM public.businesses WHERE id = NEW.business_id), 'Business');
    ELSE
        notif_title := '🔔 New Notification';
        notif_body := 'You have a new update in Fast Haazir';
    END IF;

    -- Find online and verified riders
    FOR rider_record IN 
        SELECT r.id, r.user_id, r.name 
        FROM public.riders r
        WHERE r.is_online = true 
        AND r.is_active = true 
        AND r.verification_status = 'verified'
    LOOP
        -- Log the intention to notify in notifications_log (v2 table)
        -- The Edge Function or a worker can then pick this up
        INSERT INTO public.notifications_log (
            title, 
            message, 
            user_role, 
            target_user_id, 
            status
        )
        VALUES (
            notif_title,
            notif_body,
            'rider',
            rider_record.user_id,
            'pending'
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix Trigger Condition for rider_requests (Include 'placed')
DROP TRIGGER IF EXISTS trigger_notify_riders_on_new_request ON public.rider_requests;
CREATE TRIGGER trigger_notify_riders_on_new_request
    AFTER INSERT ON public.rider_requests
    FOR EACH ROW
    WHEN (NEW.status IN ('pending', 'placed') OR NEW.status IS NULL)
    EXECUTE FUNCTION notify_available_riders();

-- 3. Fix Trigger for orders
DROP TRIGGER IF EXISTS trigger_notify_riders_on_new_order ON public.orders;
CREATE TRIGGER trigger_notify_riders_on_new_order
    AFTER INSERT ON public.orders
    FOR EACH ROW
    WHEN (NEW.status = 'placed' AND NEW.rider_id IS NULL)
    EXECUTE FUNCTION notify_available_riders();

-- 4. Cleanup old temporary table if exists
DROP TABLE IF EXISTS public.push_notification_logs CASCADE;

COMMENT ON FUNCTION public.notify_available_riders() IS 'Notifies online riders via v2 notifications_log table when new work is available.';
