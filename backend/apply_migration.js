const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jqbwynomwwjhsebcicpm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxYnd5bm9td3dqaHNlYmNpY3BtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDczNTA0NCwiZXhwIjoyMDg2MzExMDQ0fQ.mK9-f9eiJW56G7_TQjrMMQ6nVYwndrs5DV7UDYDcxmU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    console.log('Applying migration...');

    try {
        // Step 1: Add rider_request_id column
        console.log('Step 1: Adding rider_request_id column...');
        const { error: error1 } = await supabase.rpc('pg_catalog.to_regclass', {
            text: 'payments.rider_request_id'
        }).then(async () => {
            return await supabase.from('payments').select('rider_request_id').limit(1);
        }).catch(() => ({ error: null }));

        // Direct SQL via postgres meta API not available, let's check the current table structure
        console.log('Checking current payments table structure...');

        // Try to add column using raw query via a workaround
        // Since we can't execute raw SQL directly, let's create an edge function
        console.log('Creating migration edge function...');

    } catch (error) {
        console.error('Error:', error.message);
    }

    console.log('\n=== Manual Migration Required ===');
    console.log('Please run this SQL in your Supabase SQL Editor:');
    console.log(`
-- Add rider_request_id to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS rider_request_id UUID REFERENCES public.rider_requests(id) ON DELETE CASCADE;

-- Make order_id nullable since we now support rider_request_id
ALTER TABLE public.payments ALTER COLUMN order_id DROP NOT NULL;

-- Add CHECK constraint to ensure at least one of order_id or rider_request_id is provided
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_order_id_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_order_or_rider_request 
CHECK (order_id IS NOT NULL OR rider_request_id IS NOT NULL);

-- Create indexes for faster lookups on rider_request_id
CREATE INDEX IF NOT EXISTS idx_payments_rider_request_id ON public.payments(rider_request_id);
    `);
}

applyMigration();
