-- Add rejection_reason to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add admin_notes and approved_by_name to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS approved_by_name TEXT;

-- Update payments check constraint to include 'waiting_approval' if it doesn't already
-- (Note: In Postgres, we usually drop and recreate the constraint)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_status_check 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'expired', 'claimed', 'waiting_approval'));

-- Add comment
COMMENT ON COLUMN public.orders.rejection_reason IS 'Reason why an order was cancelled/rejected by admin or business';
COMMENT ON COLUMN public.payments.admin_notes IS 'Notes added by admin during manual verification';
COMMENT ON COLUMN public.payments.approved_by_name IS 'Name of the admin who manually approved the payment';
