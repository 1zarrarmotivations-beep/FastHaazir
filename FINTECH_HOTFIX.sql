-- ============================================================================
-- HOTFIX: Add Missing Columns & Fix Function Dependencies
-- ============================================================================

-- 1. Add service_type column to orders (if not exists)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'food';

-- 2. Add zone column to riders (if not exists)
ALTER TABLE riders ADD COLUMN IF NOT EXISTS zone TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- 3. Update calculate_surge_multiplier to handle missing columns gracefully
CREATE OR REPLACE FUNCTION calculate_surge_multiplier(
  p_zone TEXT,
  p_service_type TEXT,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS NUMERIC AS $$
DECLARE
  time_multiplier NUMERIC := 1.0;
BEGIN
  -- Only check time-based surge (simpler, no dependencies)
  SELECT COALESCE(MAX(multiplier), 1.0) INTO time_multiplier
  FROM surge_pricing_rules
  WHERE zone_name = p_zone
    AND condition_type = 'peak_hour'
    AND is_active = TRUE
    AND (active_days IS NULL OR TO_CHAR(p_timestamp, 'Day') = ANY(active_days))
    AND (start_time IS NULL OR p_timestamp::TIME BETWEEN start_time AND end_time);

  RETURN ROUND(time_multiplier, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update calculate_customer_fare (already fixed in FINTECH_DEPLOY_READY.sql)
CREATE OR REPLACE FUNCTION calculate_customer_fare(
  p_service_type TEXT,
  p_distance_km NUMERIC,
  p_zone TEXT DEFAULT 'default'
)
RETURNS JSONB AS $$
DECLARE
  plan RECORD;
  surge NUMERIC;
  base_charge NUMERIC;
  distance_charge NUMERIC;
  subtotal NUMERIC;
  final_fare NUMERIC;
  minimum_applied BOOLEAN := FALSE;
BEGIN
  SELECT * INTO plan
  FROM pricing_plans
  WHERE service_type = p_service_type AND is_active = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pricing plan not found for service type %', p_service_type;
  END IF;

  base_charge := plan.base_fare;
  distance_charge := GREATEST(0, p_distance_km - plan.base_distance_km) * plan.per_km_rate;
  surge := calculate_surge_multiplier(p_zone, p_service_type);
  subtotal := (base_charge + distance_charge) * surge;

  IF subtotal < plan.minimum_fare THEN
    final_fare := plan.minimum_fare;
    minimum_applied := TRUE;
  ELSE
    final_fare := subtotal;
  END IF;

  final_fare := CEIL(final_fare / 10) * 10;

  RETURN jsonb_build_object(
    'final_fare', final_fare,
    'breakdown', jsonb_build_object(
      'base_fare', base_charge,
      'distance_charge', distance_charge,
      'surge_multiplier', surge,
      'minimum_fare', plan.minimum_fare,
      'minimum_applied', minimum_applied
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION: Test the fixed functions
-- ============================================================================

-- This should now work without errors:
-- SELECT calculate_customer_fare('food', 5.75, 'Quetta_Downtown');
