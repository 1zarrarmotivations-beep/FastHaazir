/**
 * Order Scheduling Schema Migration Script
 * Run this script to apply the ORDER_SCHEDULING_SCHEMA.sql migration
 * 
 * Usage: node apply_scheduling_migration.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jqbwynomwwjhsebcicpm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxYnd5bm9td3dqaHNlYmNpY3BtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDczNTA0NCwiZXhwIjoyMDg2MzExMDQ0fQ.mK9-f9eiJW56G7_TQjrMMQ6nVYwndrs5DV7UDYDcxmU';

const supabase = createClient(supabaseUrl, supabaseKey);

const migrationSQL = `
-- ============================================================================
-- ORDER SCHEDULING SYSTEM SCHEMA
-- FastHazir Order Scheduling Database Migration
-- ============================================================================

-- 1. CREATE ENUM TYPES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_type') THEN
        CREATE TYPE public.slot_type AS ENUM ('morning', 'afternoon', 'evening', 'night');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scheduled_order_status') THEN
        CREATE TYPE public.scheduled_order_status AS ENUM ('pending', 'processing', 'assigned', 'completed', 'cancelled');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scheduling_status') THEN
        CREATE TYPE public.scheduling_status AS ENUM ('not_scheduled', 'scheduled', 'in_progress', 'completed');
    END IF;
END $$;

-- 2. CREATE TIME_SLOTS TABLE
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
    CONSTRAINT time_slots_name_unique UNIQUE (name),
    CONSTRAINT time_slots_time_check CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_time_slots_active ON public.time_slots(is_active) WHERE is_active = true;

-- 3. CREATE SCHEDULED_ORDERS TABLE
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
    CONSTRAINT scheduled_orders_date_future CHECK (scheduled_date >= CURRENT_DATE)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_orders_order_id ON public.scheduled_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_orders_user_id ON public.scheduled_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_orders_date ON public.scheduled_orders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_orders_status ON public.scheduled_orders(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_orders_datetime ON public.scheduled_orders(scheduled_datetime);
CREATE INDEX IF NOT EXISTS idx_scheduled_orders_rider_id ON public.scheduled_orders(rider_id);

-- 4. ADD COLUMNS TO ORDERS TABLE
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_datetime TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduling_status VARCHAR(50) NOT NULL DEFAULT 'not_scheduled';

CREATE INDEX IF NOT EXISTS idx_orders_scheduling ON public.orders(scheduling_status, scheduled_datetime);

-- 5. SEED DEFAULT TIME SLOTS
INSERT INTO public.time_slots (name, start_time, end_time, slot_type, is_active, min_advance_minutes, max_advance_days)
VALUES 
    ('Morning', '09:00:00', '12:00:00', 'morning', true, 30, 7),
    ('Afternoon', '12:00:00', '15:00:00', 'afternoon', true, 30, 7),
    ('2pm Slot', '14:00:00', '16:00:00', 'afternoon', true, 30, 7),
    ('Evening', '17:00:00', '20:00:00', 'evening', true, 60, 7),
    ('Night', '20:00:00', '22:00:00', 'night', true, 120, 3)
ON CONFLICT (name) DO NOTHING;

-- 6. ADD TRIGGER FOR UPDATED_AT
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

-- 7. ENABLE RLS
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Active time slots are viewable by everyone" ON public.time_slots;
CREATE POLICY "Active time slots are viewable by everyone" 
ON public.time_slots FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can view their own scheduled orders" ON public.scheduled_orders;
CREATE POLICY "Users can view their own scheduled orders" 
ON public.scheduled_orders FOR SELECT USING (auth.uid() = user_id);

-- 8. UTILITY FUNCTIONS
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

CREATE OR REPLACE FUNCTION public.can_book_slot(slot_uuid UUID, target_date DATE)
RETURNS BOOLEAN AS $$
DECLARE
    ts_record RECORD;
    current_time TIME := CURRENT_TIME;
    min_advance INTEGER;
    max_advance INTEGER;
    target_datetime TIMESTAMP;
BEGIN
    SELECT * INTO ts_record 
    FROM public.time_slots 
    WHERE id = slot_uuid AND is_active = true;
    
    IF ts_record IS NULL THEN
        RETURN false;
    END IF;
    
    min_advance := ts_record.min_advance_minutes;
    max_advance := ts_record.max_advance_days;
    
    IF target_date < CURRENT_DATE THEN
        RETURN false;
    END IF;
    
    IF target_date > CURRENT_DATE + (max_advance || ' days')::INTERVAL THEN
        RETURN false;
    END IF;
    
    IF target_date = CURRENT_DATE THEN
        target_datetime := target_date::DATE + ts_record.start_time;
        IF target_datetime < now() + (min_advance || ' minutes')::INTERVAL THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function applyMigration() {
    console.log('=== Order Scheduling Schema Migration ===\n');
    console.log('Note: Due to Supabase MCP limitations, this migration cannot be applied automatically.');
    console.log('\nPlease run the following SQL in your Supabase SQL Editor:\n');
    console.log('='.repeat(60));
    console.log(migrationSQL);
    console.log('='.repeat(60));
    console.log('\nOr copy the content from: ORDER_SCHEDULING_SCHEMA.sql\n');

    // Try to verify tables exist using the API
    console.log('\nVerifying existing tables...');

    try {
        // Check orders table
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id')
            .limit(1);

        if (ordersError) {
            console.log('❌ Orders table error:', ordersError.message);
        } else {
            console.log('✅ Orders table exists');
        }

        // Check riders table
        const { data: riders, error: ridersError } = await supabase
            .from('riders')
            .select('id')
            .limit(1);

        if (ridersError) {
            console.log('❌ Riders table error:', ridersError.message);
        } else {
            console.log('✅ Riders table exists');
        }

        // Check if time_slots exists
        try {
            const { data: slots, error: slotsError } = await supabase
                .from('time_slots')
                .select('*')
                .limit(1);

            if (slotsError) {
                console.log('⏳ time_slots table needs to be created (run SQL migration)');
            } else {
                console.log('✅ time_slots table exists');
                if (slots && slots.length > 0) {
                    console.log('   Found', slots.length, 'time slot(s)');
                }
            }
        } catch (e) {
            console.log('⏳ time_slots table needs to be created (run SQL migration)');
        }

    } catch (error) {
        console.error('Verification error:', error.message);
    }

    console.log('\n=== Migration Ready ===');
    console.log('The SQL file ORDER_SCHEDULING_SCHEMA.sql is ready to run in Supabase.');
}

applyMigration();
