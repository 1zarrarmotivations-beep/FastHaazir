-- ============================================================================
-- ADVANCED FINTECH SCHEMA - DEPLOYMENT READY (Syntax Fixed)
-- Fast Haazir - Production Grade System
-- ============================================================================

-- 1. NEW TABLES
-- ============================================================================

-- Surge Pricing Rules
CREATE TABLE IF NOT EXISTS surge_pricing_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_name TEXT NOT NULL,
  zone_bounds JSONB,
  condition_type TEXT CHECK (condition_type IN ('peak_hour', 'weather', 'demand', 'traffic', 'holiday')),
  multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  start_time TIME,
  end_time TIME,
  active_days TEXT[],
  min_demand_ratio NUMERIC(4,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surge_zone_active ON surge_pricing_rules(zone_name, is_active);
CREATE INDEX IF NOT EXISTS idx_surge_condition ON surge_pricing_rules(condition_type, is_active);

-- Distance Cache
CREATE TABLE IF NOT EXISTS distance_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pickup_lat NUMERIC(10, 6) NOT NULL,
  pickup_lng NUMERIC(10, 6) NOT NULL,
  dropoff_lat NUMERIC(10, 6) NOT NULL,
  dropoff_lng NUMERIC(10, 6) NOT NULL,
  distance_km NUMERIC(10, 2) NOT NULL,
  duration_mins INT NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)
);

CREATE INDEX IF NOT EXISTS idx_distance_coords ON distance_cache(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng);

-- Fare Quotes
CREATE TABLE IF NOT EXISTS fare_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL,
  distance_km NUMERIC(10, 2) NOT NULL,
  estimated_fare NUMERIC(10, 2) NOT NULL,
  surge_multiplier NUMERIC(4, 2) DEFAULT 1.0,
  breakdown JSONB NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  used_for_order_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_validity ON fare_quotes(id, valid_until);
CREATE INDEX IF NOT EXISTS idx_quote_order ON fare_quotes(used_for_order_id);

-- Analytics Cache
CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_expiry ON analytics_cache(cache_key, expires_at);

-- Rider Performance Daily
CREATE TABLE IF NOT EXISTS rider_performance_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id UUID NOT NULL,
  date DATE NOT NULL,
  orders_completed INT NOT NULL DEFAULT 0,
  total_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_distance_km NUMERIC(12,2) NOT NULL DEFAULT 0,
  avg_rating NUMERIC(3,2),
  avg_delivery_time_mins INT,
  bonus_earned NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE(rider_id, date)
);

CREATE INDEX IF NOT EXISTS idx_rider_perf_date ON rider_performance_daily(date);
CREATE INDEX IF NOT EXISTS idx_rider_perf_rider ON rider_performance_daily(rider_id, date DESC);

-- Order Heatmap Hourly
CREATE TABLE IF NOT EXISTS order_heatmap_hourly (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hour_timestamp TIMESTAMPTZ NOT NULL,
  lat NUMERIC(10, 6) NOT NULL,
  lng NUMERIC(10, 6) NOT NULL,
  location_type TEXT CHECK (location_type IN ('pickup', 'dropoff')),
  order_count INT NOT NULL DEFAULT 1,
  UNIQUE(hour_timestamp, lat, lng, location_type)
);

CREATE INDEX IF NOT EXISTS idx_heatmap_time ON order_heatmap_hourly(hour_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_heatmap_coords ON order_heatmap_hourly(lat, lng);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_action ON audit_logs(user_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_logs(severity, created_at DESC);

-- Anomaly Alerts
CREATE TABLE IF NOT EXISTS anomaly_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  message TEXT NOT NULL,
  metadata JSONB,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_unresolved ON anomaly_alerts(is_resolved, severity, created_at DESC);

-- 2. ENHANCE EXISTING TABLES
-- ============================================================================

-- Add columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS distance_km NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_fare NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_fare NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_earning NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS surge_multiplier NUMERIC(4,2) DEFAULT 1.0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fare_quote_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fare_locked_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS zone TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_financial ON orders(status, actual_fare, commission);
CREATE INDEX IF NOT EXISTS idx_orders_rider_earnings ON orders(rider_id, status, rider_earning);
CREATE INDEX IF NOT EXISTS idx_orders_completed_time ON orders(completed_at) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_orders_zone_time ON orders(zone, created_at);

-- Add columns to rider_wallets
ALTER TABLE rider_wallets ADD COLUMN IF NOT EXISTS weekly_earnings NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE rider_wallets ADD COLUMN IF NOT EXISTS weekly_orders INT NOT NULL DEFAULT 0;
ALTER TABLE rider_wallets ADD COLUMN IF NOT EXISTS last_payout_at TIMESTAMPTZ;

-- Add metadata to wallet_transactions
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_wallet_tx_category ON wallet_transactions(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_order ON wallet_transactions(order_id);

-- 3. PRICING FUNCTIONS (FIXED SYNTAX)
-- ============================================================================

-- Calculate Surge Multiplier
CREATE OR REPLACE FUNCTION calculate_surge_multiplier(
  p_zone TEXT,
  p_service_type TEXT,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS NUMERIC AS $$
DECLARE
  time_multiplier NUMERIC := 1.0;
  demand_multiplier NUMERIC := 1.0;
  demand_count INT;
  active_riders INT;
  demand_ratio NUMERIC;
BEGIN
  -- 1. Check time-based surge rules
  SELECT COALESCE(MAX(multiplier), 1.0) INTO time_multiplier
  FROM surge_pricing_rules
  WHERE zone_name = p_zone
    AND condition_type = 'peak_hour'
    AND is_active = TRUE
    AND (active_days IS NULL OR TO_CHAR(p_timestamp, 'Day') = ANY(active_days))
    AND (start_time IS NULL OR p_timestamp::TIME BETWEEN start_time AND end_time);

  -- 2. Check demand-based surge (if riders table exists)
  BEGIN
    SELECT 
      COUNT(*) FILTER (WHERE status IN ('pending', 'assigned')),
      (SELECT COUNT(*) FROM riders WHERE is_online = TRUE)
    INTO demand_count, active_riders
    FROM orders
    WHERE service_type = p_service_type
      AND created_at > NOW() - INTERVAL '30 minutes';

    IF active_riders > 0 THEN
      demand_ratio := demand_count::NUMERIC / active_riders;
      
      SELECT COALESCE(MAX(multiplier), 1.0) INTO demand_multiplier
      FROM surge_pricing_rules
      WHERE zone_name = p_zone
        AND condition_type = 'demand'
        AND is_active = TRUE
        AND demand_ratio >= COALESCE(min_demand_ratio, 2.0);
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      demand_multiplier := 1.0;
  END;

  RETURN ROUND(GREATEST(time_multiplier, demand_multiplier), 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate Customer Fare
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

-- Calculate Rider Earning
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
  SELECT * INTO plan
  FROM pricing_plans
  WHERE service_type = p_service_type AND is_active = TRUE
  LIMIT 1;

  base_earning := COALESCE(plan.rider_per_km_rate, 12) * p_distance_km;
  base_earning := GREATEST(base_earning, COALESCE(plan.minimum_rider_earning, 60));

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

-- 4. ORDER COMPLETION (ATOMIC)
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_order_and_update_wallet(
  p_order_id UUID,
  p_rider_id UUID,
  p_tip NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  order_rec RECORD;
  rider_earning_data JSONB;
  rider_earning NUMERIC;
  bonus NUMERIC;
  commission NUMERIC;
  current_balance NUMERIC;
  new_balance NUMERIC;
  daily_orders INT;
BEGIN
  SELECT * INTO order_rec
  FROM orders
  WHERE id = p_order_id AND rider_id = p_rider_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or not assigned to this rider';
  END IF;

  IF order_rec.status = 'completed' THEN
    RAISE EXCEPTION 'Order already completed';
  END IF;

  SELECT COUNT(*) INTO daily_orders
  FROM orders
  WHERE rider_id = p_rider_id
    AND status = 'completed'
    AND DATE(completed_at) = CURRENT_DATE;

  rider_earning_data := calculate_rider_earning(
    order_rec.service_type,
    COALESCE(order_rec.distance_km, 5.0),
    p_tip,
    daily_orders
  );

  rider_earning := (rider_earning_data->>'total_earning')::NUMERIC;
  bonus := (rider_earning_data->>'bonus')::NUMERIC;
  commission := COALESCE(order_rec.actual_fare, order_rec.total_price) - rider_earning;

  IF commission < 0 THEN
    INSERT INTO anomaly_alerts (alert_type, severity, entity_type, entity_id, message, metadata)
    VALUES ('negative_profit', 'critical', 'order', p_order_id, 
            'Order has negative commission', 
            jsonb_build_object('fare', order_rec.actual_fare, 'earning', rider_earning));
  END IF;

  SELECT balance INTO current_balance
  FROM rider_wallets
  WHERE rider_id = p_rider_id
  FOR UPDATE;

  new_balance := COALESCE(current_balance, 0) + rider_earning;

  INSERT INTO wallet_transactions (
    wallet_id, order_id, amount, type, category, balance_after, description, metadata
  ) VALUES (
    p_rider_id, p_order_id, rider_earning, 'credit', 'fare_earning',
    new_balance, 'Order completed',
    jsonb_build_object('commission', commission, 'tip', p_tip, 'bonus', bonus)
  );

  UPDATE rider_wallets
  SET 
    balance = new_balance,
    lifetime_earnings = COALESCE(lifetime_earnings, 0) + rider_earning,
    weekly_earnings = COALESCE(weekly_earnings, 0) + rider_earning,
    weekly_orders = COALESCE(weekly_orders, 0) + 1,
    updated_at = NOW()
  WHERE rider_id = p_rider_id;

  UPDATE orders
  SET 
    status = 'completed',
    rider_earning = rider_earning,
    commission = commission,
    completed_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'rider_earning', rider_earning,
    'bonus', bonus,
    'commission', commission,
    'new_balance', new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ANALYTICS FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_realtime_order_metrics(p_period TEXT DEFAULT 'today')
RETURNS JSONB AS $$
DECLARE
  start_time TIMESTAMPTZ;
  result JSONB;
BEGIN
  start_time := CASE p_period
    WHEN 'today' THEN DATE_TRUNC('day', NOW())
    WHEN 'week' THEN DATE_TRUNC('week', NOW())
    WHEN 'month' THEN DATE_TRUNC('month', NOW())
    ELSE NOW() - INTERVAL '1 day'
  END;

  SELECT jsonb_build_object(
    'total_orders', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'pending', COUNT(*) FILTER (WHERE status IN ('pending', 'assigned', 'picked_up')),
    'total_revenue', COALESCE(SUM(actual_fare) FILTER (WHERE status = 'completed'), 0),
    'total_commission', COALESCE(SUM(commission) FILTER (WHERE status = 'completed'), 0),
    'avg_order_value', ROUND(COALESCE(AVG(actual_fare) FILTER (WHERE status = 'completed'), 0), 2)
  ) INTO result
  FROM orders
  WHERE created_at >= start_time;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. SEED DATA
-- ============================================================================

INSERT INTO surge_pricing_rules (zone_name, condition_type, multiplier, start_time, end_time, active_days)
VALUES 
('Quetta_Downtown', 'peak_hour', 1.3, '12:00', '14:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
('Quetta_Downtown', 'peak_hour', 1.5, '19:00', '21:00', ARRAY['Friday', 'Saturday', 'Sunday'])
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEPLOYMENT COMPLETE ✅
-- ============================================================================
