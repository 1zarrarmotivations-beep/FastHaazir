-- ============================================================================
-- FAST HAAZIR - ADVANCED ADMIN & STORE MANAGEMENT ENHANCEMENTS
-- Created: February 9, 2026
-- ============================================================================

-- 1. ADMIN ROLE SYSTEM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
        CREATE TYPE public.admin_role AS ENUM ('super_admin', 'order_manager', 'store_manager', 'support_admin');
    END IF;
END $$;

ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS role admin_role DEFAULT 'order_manager';

-- 2. HARD LOCK PERMANENT SUPER ADMIN
-- Ensure the super admin exists and has the correct role
INSERT INTO public.admins (phone, role, is_active)
VALUES ('+923110111419', 'super_admin', true)
ON CONFLICT (phone) DO UPDATE SET role = 'super_admin', is_active = true;

-- Function to protect the super admin from any modification/deletion
CREATE OR REPLACE FUNCTION public.protect_super_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- If trying to delete the super admin
    IF (TG_OP = 'DELETE') THEN
        IF (OLD.phone = '+923110111419') THEN
            RAISE EXCEPTION 'PERMANENT_ADMIN_LOCK: The super admin account cannot be deleted.';
        END IF;
        RETURN OLD;
    END IF;

    -- If trying to update the super admin
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.phone = '+923110111419') THEN
            -- Only allow updates to user_id (for first-time login linking)
            -- But prevent changes to phone, role, or is_active
            IF (NEW.phone != OLD.phone OR NEW.role != OLD.role OR NEW.is_active != OLD.is_active) THEN
                RAISE EXCEPTION 'PERMANENT_ADMIN_LOCK: The super admin account credentials and role are locked.';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for protection
DROP TRIGGER IF EXISTS tr_protect_super_admin ON public.admins;
CREATE TRIGGER tr_protect_super_admin
BEFORE UPDATE OR DELETE ON public.admins
FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin();

-- 3. STORE MANAGEMENT ENHANCEMENTS
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT false;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS busy_reason TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS max_orders_per_hour INTEGER DEFAULT 0;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'normal' CHECK (priority_level IN ('high', 'normal', 'low'));
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Add pharmacy to business_type enum if it doesn't exist
-- Note: Enum modifications in PostgreSQL cannot be done inside a transaction easily in older versions, 
-- but Supabase supports it usually.
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'pharmacy';

-- 4. ORDER FLOW & TIMELINE
CREATE TABLE IF NOT EXISTS public.order_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    rider_request_id UUID REFERENCES public.rider_requests(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for timeline performance
CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON public.order_status_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_rider_request_id ON public.order_status_logs(rider_request_id);

-- 5. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Initialize global order toggle
INSERT INTO public.system_settings (key, value)
VALUES ('global_order_receiving', '{"enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 6. RLS FOR NEW TABLES
ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage all logs
CREATE POLICY "Admins can manage order logs"
ON public.order_status_logs FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can view and manage settings
CREATE POLICY "Admins can manage system settings"
ON public.system_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Customers can view logs for their own orders
CREATE POLICY "Customers can view logs for their own orders"
ON public.order_status_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE id = order_id AND customer_id = auth.uid()
    ) OR 
    EXISTS (
        SELECT 1 FROM public.rider_requests 
        WHERE id = rider_request_id AND customer_id = auth.uid()
    )
);

-- Trigger to automatically log order status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.order_status_logs (order_id, status)
        VALUES (NEW.id, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_log_order_status_change ON public.orders;
CREATE TRIGGER tr_log_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

DROP TRIGGER IF EXISTS tr_log_rider_request_status_change ON public.rider_requests;
CREATE TRIGGER tr_log_rider_request_status_change
AFTER UPDATE ON public.rider_requests
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();
