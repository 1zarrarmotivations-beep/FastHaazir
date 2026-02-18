-- Migration: Fix Order Amount Inconsistency & Establish Single Source of Truth
-- Date: 2026-02-21

-- 1. Ensure columns exist and have correct types/defaults
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rider_earning DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_commission DECIMAL(10,2) DEFAULT 0;

-- 2. Add Constraint to prevent negative totals
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS positive_total_amount;
ALTER TABLE public.orders ADD CONSTRAINT positive_total_amount CHECK (total_amount >= 0);

-- Make total_amount NOT NULL (Step 1 requirement)
-- We first ensure no nulls exist by running update
UPDATE public.orders SET total_amount = 0 WHERE total_amount IS NULL;
ALTER TABLE public.orders ALTER COLUMN total_amount SET NOT NULL;

-- 3. Create Trigger Function for SSoT Calculation (Step 2 & 3)
CREATE OR REPLACE FUNCTION public.handle_order_total_calculation()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure defaults if null
    NEW.subtotal := COALESCE(NEW.subtotal, 0);
    NEW.delivery_fee := COALESCE(NEW.delivery_fee, 0);
    NEW.tax := COALESCE(NEW.tax, 0);
    NEW.discount := COALESCE(NEW.discount, 0);

    -- THE CALCULATION (Single Source of Truth)
    NEW.total_amount := NEW.subtotal + NEW.delivery_fee + NEW.tax - NEW.discount;

    -- Basic Validation (Step 8)
    IF NEW.total_amount < 0 THEN
        RAISE EXCEPTION 'Total amount cannot be negative. Check discount or fees.';
    END IF;

    -- Ensure rider earning and admin commission are initialized if null
    -- (Logic for these usually depends on rate, but here we just ensure non-null)
    NEW.rider_earning := COALESCE(NEW.rider_earning, 0);
    NEW.admin_commission := COALESCE(NEW.admin_commission, 0);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Trigger (Step 7)
DROP TRIGGER IF EXISTS trigger_calculate_order_total ON public.orders;
CREATE TRIGGER trigger_calculate_order_total
    BEFORE INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_order_total_calculation();

-- 5. Fix Historical Data (Step 6)
-- Update rows where total is 0 but subtotal has value
UPDATE public.orders
SET total_amount = COALESCE(subtotal, 0) + COALESCE(delivery_fee, 0) + COALESCE(tax, 0) - COALESCE(discount, 0)
WHERE total_amount = 0 AND subtotal > 0;

-- Log the fix for audit
COMMENT ON TRIGGER trigger_calculate_order_total ON public.orders IS 'Ensures total_amount is always calculated by backend.';
