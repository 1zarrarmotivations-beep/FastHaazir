-- Add scheduling columns to grocery_orders table
-- This migration adds the scheduled_datetime and slot_id columns to the grocery_orders table

-- Add scheduled_datetime column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grocery_orders' AND column_name = 'scheduled_datetime'
    ) THEN
        ALTER TABLE public.grocery_orders 
        ADD COLUMN scheduled_datetime TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add slot_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grocery_orders' AND column_name = 'slot_id'
    ) THEN
        ALTER TABLE public.grocery_orders 
        ADD COLUMN slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add scheduling_status column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grocery_orders' AND column_name = 'scheduling_status'
    ) THEN
        ALTER TABLE public.grocery_orders 
        ADD COLUMN scheduling_status VARCHAR(50) NOT NULL DEFAULT 'not_scheduled';
    END IF;
END $$;

-- Create index on grocery_orders table for scheduling queries
CREATE INDEX IF NOT EXISTS idx_grocery_orders_scheduling ON public.grocery_orders(scheduling_status, scheduled_datetime);

-- Add comments
COMMENT ON COLUMN public.grocery_orders.scheduled_datetime IS 'The scheduled date and time for order delivery';
COMMENT ON COLUMN public.grocery_orders.slot_id IS 'Foreign key to time_slots table';
COMMENT ON COLUMN public.grocery_orders.scheduling_status IS 'Status of scheduling: not_scheduled, scheduled, in_progress, completed';
