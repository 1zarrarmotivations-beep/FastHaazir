-- ============================================================================
-- ORDER SCHEDULING SYSTEM SCHEMA
-- FastHazir Order Scheduling Database Migration
-- ============================================================================
-- This migration adds support for:
-- - Scheduling orders for specific dates and times
-- - Configurable time slots
-- - Auto-assign rider when scheduled time arrives
-- ============================================================================

-- ============================================================================
-- 1. CREATE ENUM TYPES
-- ============================================================================

-- Slot type enum for time slots categorization
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_type') THEN
        CREATE TYPE public.slot_type AS ENUM ('morning', 'afternoon', 'evening', 'night');
    END IF;
END $$;

-- Scheduled order status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scheduled_order_status') THEN
        CREATE TYPE public.scheduled_order_status AS ENUM ('pending', 'processing', 'assigned', 'completed', 'cancelled');
    END IF;
END $$;

-- Scheduling status for orders table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scheduling_status') THEN
        CREATE TYPE public.scheduling_status AS ENUM ('not_scheduled', 'scheduled', 'in_progress', 'completed');
    END IF;
END $$;

-- ============================================================================
-- 2. CREATE TIME_SLOTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.time_slots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_type public.slot_type NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    min_advance_minutes INTEGER NOT NULL DEFAULT 30,
    max_advance_days INTEGER NOT NULL DEFAULT 7,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT time_slots_name_unique UNIQUE (name),
    CONSTRAINT time_slots_time_check CHECK (end_time > start_time)
);

-- Index for active time slots
CREATE INDEX idx_time_slots_active ON public.time_slots(is_active) WHERE is_active = true;

-- ============================================================================
-- 3. CREATE SCHEDULED_ORDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.scheduled_orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL,
    scheduled_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    status public.scheduled_order_status NOT NULL DEFAULT 'pending',
    rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT scheduled_orders_date_future CHECK (scheduled_date >= CURRENT_DATE)
);

-- Indexes for performance
CREATE INDEX idx_scheduled_orders_order_id ON public.scheduled_orders(order_id);
CREATE INDEX idx_scheduled_orders_user_id ON public.scheduled_orders(user_id);
CREATE INDEX idx_scheduled_orders_date ON public.scheduled_orders(scheduled_date);
CREATE INDEX idx_scheduled_orders_status ON public.scheduled_orders(status);
CREATE INDEX idx_scheduled_orders_datetime ON public.scheduled_orders(scheduled_datetime);
CREATE INDEX idx_scheduled_orders_rider_id ON public.scheduled_orders(rider_id);

-- ============================================================================
-- 4. ADD COLUMNS TO EXISTING ORDERS TABLE
-- ============================================================================

-- Add scheduled_datetime column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'scheduled_datetime'
    ) THEN
        ALTER TABLE public.orders 
        ADD COLUMN scheduled_datetime TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add slot_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'slot_id'
    ) THEN
        ALTER TABLE public.orders 
        ADD COLUMN slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add scheduling_status column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'scheduling_status'
    ) THEN
        ALTER TABLE public.orders 
        ADD COLUMN scheduling_status VARCHAR(50) NOT NULL DEFAULT 'not_scheduled';
    END IF;
END $$;

-- Create index on orders table for scheduling queries
CREATE INDEX IF NOT EXISTS idx_orders_scheduling ON public.orders(scheduling_status, scheduled_datetime);

-- ============================================================================
-- 5. SEED DEFAULT TIME SLOTS
-- ============================================================================

-- Insert default time slots (only if table is empty or we want to add defaults)
INSERT INTO public.time_slots (name, start_time, end_time, slot_type, is_active, min_advance_minutes, max_advance_days)
VALUES 
    ('Morning', '09:00:00', '12:00:00', 'morning', true, 30, 7),
    ('Afternoon', '12:00:00', '15:00:00', 'afternoon', true, 30, 7),
    ('2pm Slot', '14:00:00', '16:00:00', 'afternoon', true, 30, 7),
    ('Evening', '17:00:00', '20:00:00', 'evening', true, 60, 7),
    ('Night', '20:00:00', '22:00:00', 'night', true, 120, 3)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 6. ADD TRIGGER FOR UPDATED_AT ON SCHEDULED_ORDERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_scheduled_orders_updated_at ON public.scheduled_orders;
CREATE TRIGGER update_scheduled_orders_updated_at
    BEFORE UPDATE ON public.scheduled_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_slots (public read for active slots)
CREATE POLICY "Active time slots are viewable by everyone" 
ON public.time_slots FOR SELECT USING (is_active = true);

-- RLS Policies for scheduled_orders
-- Users can view their own scheduled orders
CREATE POLICY "Users can view their own scheduled orders" 
ON public.scheduled_orders FOR SELECT USING (auth.uid() = user_id);

-- Riders can view assigned orders
CREATE POLICY "Riders can view assigned orders" 
ON public.scheduled_orders FOR SELECT 
USING (rider_id IN (SELECT id FROM public.riders WHERE auth.uid() = user_id));

-- ============================================================================
-- 8. CREATE UTILITY FUNCTIONS
-- ============================================================================

-- Function to get available time slots for a specific date
CREATE OR REPLACE FUNCTION public.get_available_time_slots(target_date DATE)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    start_time TIME,
    end_time TIME,
    slot_type public.slot_type,
    is_available BOOLEAN
) AS $$
DECLARE
    current_time TIME := CURRENT_TIME;
    advance_minutes INTEGER;
BEGIN
    -- Get minimum advance time from first active slot
    SELECT min_advance_minutes INTO advance_minutes 
    FROM public.time_slots 
    WHERE is_active = true 
    ORDER BY min_advance_minutes DESC 
    LIMIT 1;
    
    IF advance_minutes IS NULL THEN
        advance_minutes := 30;
    END IF;
    
    RETURN QUERY
    SELECT 
        ts.id,
        ts.name,
        ts.start_time,
        ts.end_time,
        ts.slot_type,
        CASE 
            WHEN target_date > CURRENT_DATE THEN true
            WHEN target_date = CURRENT_DATE AND ts.start_time > (current_time + (advance_minutes || ' minutes')::INTERVAL) THEN true
            ELSE false
        END AS is_available
    FROM public.time_slots ts
    WHERE ts.is_active = true
    ORDER BY ts.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a slot can be booked
CREATE OR REPLACE FUNCTION public.can_book_slot(slot_uuid UUID, target_date DATE)
RETURNS BOOLEAN AS $$
DECLARE
    ts_record RECORD;
    current_time TIME := CURRENT_TIME;
    min_advance INTEGER;
    max_advance INTEGER;
    target_datetime TIMESTAMP;
BEGIN
    -- Get slot details
    SELECT * INTO ts_record 
    FROM public.time_slots 
    WHERE id = slot_uuid AND is_active = true;
    
    IF ts_record IS NULL THEN
        RETURN false;
    END IF;
    
    min_advance := ts_record.min_advance_minutes;
    max_advance := ts_record.max_advance_days;
    
    -- Check if date is within advance booking window
    IF target_date < CURRENT_DATE THEN
        RETURN false;
    END IF;
    
    IF target_date > CURRENT_DATE + (max_advance || ' days')::INTERVAL THEN
        RETURN false;
    END IF;
    
    -- For same-day bookings, check if enough advance time
    IF target_date = CURRENT_DATE THEN
        target_datetime := target_date::DATE + ts_record.start_time;
        IF target_datetime < now() + (min_advance || ' minutes')::INTERVAL THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. SCHEMA COMPLETE
-- ============================================================================

COMMENT ON TABLE public.time_slots IS 'Configurable time slots for order scheduling';
COMMENT ON TABLE public.scheduled_orders IS 'Scheduled orders with date, time slot, and rider assignment';
COMMENT ON COLUMN public.orders.scheduled_datetime IS 'The scheduled date and time for order delivery';
COMMENT ON COLUMN public.orders.slot_id IS 'Foreign key to time_slots table';
COMMENT ON COLUMN public.orders.scheduling_status IS 'Status of scheduling: not_scheduled, scheduled, in_progress, completed';

-- End of migration
