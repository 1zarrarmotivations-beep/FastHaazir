-- ============================================================================
-- COMPLETE HOTFIX: Add Missing Columns to pricing_plans
-- ============================================================================

-- Add the rider-specific columns that the new functions expect
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS rider_per_km_rate NUMERIC(10,2) DEFAULT 12.00;
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS minimum_rider_earning NUMERIC(10,2) DEFAULT 60.00;

-- Update existing rows with reasonable defaults based on commission model
UPDATE pricing_plans 
SET 
  rider_per_km_rate = per_km_rate * 0.80,  -- 80% of customer rate
  minimum_rider_earning = minimum_fare * 0.70  -- 70% of minimum fare
WHERE rider_per_km_rate IS NULL OR rider_per_km_rate = 12.00;

-- ============================================================================
-- Fix calculate_rider_earning to use the new columns
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_rider_earning(
  p_service_type TEXT,
  p_distance_km NUMERIC,
  p_tip NUMERIC DEFAULT 0,
  p_daily_orders INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  plan RECORD;
  base_earning NUMERIC;
  bonus NUMERIC := 0;
  total_earning NUMERIC;
BEGIN
  -- Get pricing plan
  SELECT * INTO plan
  FROM pricing_plans
  WHERE service_type = p_service_type AND is_active = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    -- Fallback if no plan exists
    base_earning := 12.00 * p_distance_km;
  ELSE
    -- Use rider_per_km_rate if available
    base_earning := COALESCE(plan.rider_per_km_rate, plan.per_km_rate * 0.80, 12.00) * p_distance_km;
    base_earning := GREATEST(base_earning, COALESCE(plan.minimum_rider_earning, plan.minimum_fare * 0.70, 60.00));
  END IF;

  -- Calculate daily bonus
  bonus := CASE
    WHEN p_daily_orders >= 20 THEN 500
    WHEN p_daily_orders >= 10 THEN 200
    WHEN p_daily_orders >= 5 THEN 50
    ELSE 0
  END;

  total_earning := base_earning + p_tip + bonus;

  RETURN jsonb_build_object(
    'total_earning', ROUND(total_earning, 2),
    'base_earning', ROUND(base_earning, 2),
    'tip', p_tip,
    'bonus', bonus
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to test)
-- ============================================================================

-- 1. Check pricing_plans now has the new columns
-- SELECT service_type, per_km_rate, rider_per_km_rate, minimum_fare, minimum_rider_earning 
-- FROM pricing_plans;

-- 2. Test customer fare calculation
-- SELECT calculate_customer_fare('food', 5.75, 'Quetta_Downtown');

-- 3. Test rider earning calculation
-- SELECT calculate_rider_earning('food', 5.75, 0, 8);

-- Expected: Both functions should return valid JSON now!
