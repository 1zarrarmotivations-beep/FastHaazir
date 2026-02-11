# 🚀 ADVANCED FINTECH PRICING & ANALYTICS SYSTEM
**Faast Haazir - Production-Grade Autonomous Backend Architecture**

---

## 📋 EXECUTIVE SUMMARY

This document defines the **complete autonomous backend system** for Faast Haazir's delivery pricing, rider payments, wallet management, commission tracking, and real-time analytics. The system is designed for **10k+ concurrent users**, full **server-side autonomy**, and **AI-powered predictive insights**.

---

## 🏗️ ENHANCED BACKEND ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER (React/Android)                 │
│  - Customer App  - Rider App  - Admin Dashboard                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS/WSS
┌────────────────────────▼────────────────────────────────────────┐
│                    API GATEWAY (Supabase Edge Functions)         │
│  - JWT Auth  - Rate Limiting  - Request Validation              │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   PRICING ENGINE (Autonomous)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐         │
│  │  Distance   │  │  Fare Calc   │  │  Commission    │         │
│  │  Service    │  │  Multipliers │  │  Calculator    │         │
│  └─────────────┘  └──────────────┘  └────────────────┘         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                 WALLET & LEDGER ENGINE                           │
│  - Atomic Transactions  - Bonus Calculation  - Audit Logs       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│               ANALYTICS & INSIGHTS ENGINE                        │
│  - Real-time Aggregation  - Heatmaps  - Predictive AI           │
│  - WebSocket Broadcasts   - Anomaly Detection                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    POSTGRESQL DATABASE                           │
│  - orders  - rider_wallets  - wallet_ledger  - analytics_cache  │
│  - pricing_plans  - surge_rules  - audit_logs                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 💰 PRICING FORMULAS (Server-Side Only)

### 1. Customer Fare Calculation
```sql
-- Base Formula
customer_fare = MAX(
    (base_fare + (per_km_rate × distance_km)) × multiplier,
    minimum_fare
);

-- Multiplier Logic
multiplier = surge_multiplier × peak_hour_multiplier × weather_multiplier × traffic_multiplier;
```

### 2. Rider Earning Calculation
```sql
-- Rider Base Earning
rider_earning = MAX(
    (rider_per_km_rate × distance_km) + tip,
    minimum_rider_earning
) + bonus;

-- Bonus Logic
bonus = 
  CASE
    WHEN daily_orders >= 20 THEN 500
    WHEN daily_orders >= 10 THEN 200
    ELSE 0
  END;
```

### 3. Commission Calculation
```sql
-- Platform Commission
commission = customer_fare - rider_earning;

-- Guardrail: Minimum Commission
IF commission < minimum_commission THEN
  RAISE ALERT 'Negative profit margin detected';
END IF;
```

### 4. Example Calculation
```
Service Type: Food
Distance: 5.75 km
Time: 14:30 (Peak Hour)
Weather: Clear

Base Fare: 60 PKR
Per KM Rate: 18 PKR
Distance Charge: 18 × 5.75 = 103.5 PKR
Subtotal: 60 + 103.5 = 163.5 PKR
Peak Multiplier: 1.2
Customer Fare: 163.5 × 1.2 = 196.2 PKR → Rounded 200 PKR

Rider Per KM Rate: 15 PKR
Rider Earning: 15 × 5.75 = 86.25 PKR
+ Tip: 20 PKR
+ Bonus: 0 PKR
Total Rider Earning: 106.25 PKR → Rounded 110 PKR

Commission: 200 - 110 = 90 PKR (45% margin ✅)
```

---

## 🗄️ DATABASE SCHEMA (Enhanced)

### Core Tables

#### `pricing_plans` (Already Created)
```sql
-- Service-level pricing configuration
CREATE TABLE pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT UNIQUE CHECK (service_type IN ('food', 'grocery', 'parcel', 'qurbani')),
  base_fare NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  base_distance_km NUMERIC(10,2) NOT NULL DEFAULT 2.0,
  per_km_rate NUMERIC(10,2) NOT NULL DEFAULT 15.00,
  per_min_rate NUMERIC(10,2) NOT NULL DEFAULT 2.00,
  minimum_fare NUMERIC(10,2) NOT NULL DEFAULT 80.00,
  rider_per_km_rate NUMERIC(10,2) NOT NULL DEFAULT 12.00,
  minimum_rider_earning NUMERIC(10,2) NOT NULL DEFAULT 60.00,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pricing_service_active ON pricing_plans(service_type, is_active);
```

#### `surge_pricing_rules` (New - Dynamic Pricing)
```sql
CREATE TABLE surge_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name TEXT NOT NULL, -- e.g., 'Quetta_Downtown'
  zone_bounds JSONB, -- GeoJSON polygon for geofencing
  condition_type TEXT CHECK (condition_type IN ('peak_hour', 'weather', 'demand', 'traffic')),
  multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  start_time TIME,
  end_time TIME,
  active_days TEXT[], -- ['monday', 'tuesday', ...]
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_surge_zone ON surge_pricing_rules(zone_name, is_active);
```

#### `orders` (Enhanced)
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS distance_km NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_fare NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_fare NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_earning NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS surge_multiplier NUMERIC(4,2) DEFAULT 1.0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fare_quote_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fare_locked_at TIMESTAMPTZ;

CREATE INDEX idx_orders_financial ON orders(status, actual_fare, commission);
CREATE INDEX idx_orders_rider_earnings ON orders(rider_id, status, rider_earning);
```

#### `rider_wallets` (Already Created)
```sql
-- Master wallet for each rider
CREATE TABLE rider_wallets (
  rider_id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  pending_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  lifetime_earnings NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  weekly_earnings NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  weekly_orders INT NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'suspended')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_status ON rider_wallets(status);
```

#### `wallet_transactions` (Already Created - Enhanced)
```sql
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX idx_wallet_tx_category ON wallet_transactions(category, created_at DESC);
CREATE INDEX idx_wallet_tx_order ON wallet_transactions(order_id);
```

#### `analytics_cache` (New - Performance Optimization)
```sql
CREATE TABLE analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_cache_expiry ON analytics_cache(cache_key, expires_at);
```

#### `audit_logs` (New - Security & Compliance)
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'update_pricing', 'manual_payout', 'cancel_order'
  entity_type TEXT NOT NULL, -- 'order', 'wallet', 'pricing_plan'
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user_action ON audit_logs(user_id, action, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
```

---

## 🔌 API ENDPOINTS SPECIFICATION

### 1. Order Estimation (Customer)
```
POST /api/order/estimate
Authorization: Bearer <customer_jwt>

Request:
{
  "service_type": "food",
  "pickup_lat": 30.1798,
  "pickup_lng": 66.9750,
  "dropoff_lat": 30.1850,
  "dropoff_lng": 66.9820
}

Response:
{
  "quote_id": "q_a1b2c3d4",
  "distance_km": 5.75,
  "estimated_fare": 200,
  "breakdown": {
    "base_fare": 60,
    "distance_charge": 103.5,
    "surge_multiplier": 1.2,
    "minimum_applied": false
  },
  "estimated_time_minutes": 25,
  "valid_until": "2026-02-12T02:30:00Z"
}
```

### 2. Create Order (Customer)
```
POST /api/order/create
Authorization: Bearer <customer_jwt>

Request:
{
  "quote_id": "q_a1b2c3d4",
  "service_type": "food",
  "pickup_address": "Main Bazar, Quetta",
  "dropoff_address": "Jinnah Road, Quetta",
  "items": [...],
  "payment_method": "cash_on_delivery"
}

Response:
{
  "order_id": "ord_xyz123",
  "status": "pending",
  "locked_fare": 200,
  "distance_km": 5.75,
  "commission": 90,
  "rider_earning": 110,
  "created_at": "2026-02-12T02:18:00Z"
}
```

### 3. Complete Order (Rider)
```
POST /api/rider/complete-order
Authorization: Bearer <rider_jwt>

Request:
{
  "order_id": "ord_xyz123",
  "otp_verified": true,
  "actual_distance_km": 5.80,
  "completion_photo_url": "https://..."
}

Response:
{
  "success": true,
  "rider_earning": 110,
  "bonus_earned": 0,
  "commission_charged": 90,
  "wallet_balance": 1250.50,
  "daily_orders_count": 8
}
```

### 4. Admin Analytics - Orders
```
GET /api/admin/analytics/orders?period=today
Authorization: Bearer <admin_jwt>

Response:
{
  "total_orders": 342,
  "completed": 298,
  "cancelled": 12,
  "pending": 32,
  "total_revenue": 68400,
  "total_commission": 20520,
  "avg_order_value": 200,
  "peak_hour": "14:00-15:00",
  "by_service": {
    "food": 210,
    "grocery": 98,
    "parcel": 34
  }
}
```

### 5. Admin Analytics - Riders
```
GET /api/admin/analytics/riders?period=week
Authorization: Bearer <admin_jwt>

Response:
{
  "total_riders": 45,
  "active_now": 23,
  "top_performers": [
    {
      "rider_id": "r_123",
      "name": "Ali Khan",
      "orders_completed": 87,
      "earnings": 12450,
      "avg_rating": 4.8,
      "avg_delivery_time_mins": 22
    }
  ],
  "total_payouts": 156780,
  "avg_earning_per_order": 110
}
```

### 6. Admin Analytics - Financial
```
GET /api/admin/analytics/financial?period=month
Authorization: Bearer <admin_jwt>

Response:
{
  "total_revenue": 2456780,
  "total_commission": 738034,
  "total_rider_payouts": 1718746,
  "profit_margin": 30.04,
  "peak_revenue_day": "2026-02-05",
  "commission_by_service": {
    "food": 450120,
    "grocery": 201340,
    "parcel": 86574
  },
  "alerts": [
    {
      "type": "low_margin",
      "message": "15 orders had commission < 15%",
      "severity": "warning"
    }
  ]
}
```

### 7. Admin Analytics - Heatmap
```
GET /api/admin/analytics/heatmap?type=pickup&period=week
Authorization: Bearer <admin_jwt>

Response:
{
  "heatmap_data": [
    {"lat": 30.1798, "lng": 66.9750, "intensity": 87},
    {"lat": 30.1850, "lng": 66.9820, "intensity": 64},
    ...
  ],
  "top_zones": [
    {"zone": "Quetta_Downtown", "orders": 234},
    {"zone": "Jinnah_Road", "orders": 189}
  ]
}
```

### 8. WebSocket - Real-time Analytics
```
WSS /api/admin/analytics/live
Authorization: Bearer <admin_jwt>

Server Push (Every 5s):
{
  "timestamp": "2026-02-12T02:18:05Z",
  "active_orders": 32,
  "active_riders": 23,
  "hourly_revenue": 12450,
  "avg_delivery_time": 24
}
```

---

## 💼 WALLET LOGIC (Atomic & Secure)

### Automatic Wallet Update on Order Completion
```sql
-- Called when rider completes an order
CREATE OR REPLACE FUNCTION process_order_completion(
  p_order_id UUID,
  p_rider_id UUID,
  p_rider_earning NUMERIC,
  p_commission NUMERIC,
  p_bonus NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
  weekly_count INT;
BEGIN
  -- 1. Lock wallet row
  SELECT balance, weekly_orders INTO current_balance, weekly_count
  FROM rider_wallets
  WHERE rider_id = p_rider_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for rider %', p_rider_id;
  END IF;

  -- 2. Calculate new balance
  new_balance := current_balance + p_rider_earning + p_bonus;

  -- 3. Insert ledger entry (immutable)
  INSERT INTO wallet_transactions (
    wallet_id, order_id, amount, type, category, balance_after, description, metadata
  ) VALUES (
    p_rider_id, p_order_id, p_rider_earning + p_bonus, 'credit', 'fare_earning',
    new_balance, 'Order ' || p_order_id || ' completed',
    jsonb_build_object('commission', p_commission, 'bonus', p_bonus)
  );

  -- 4. Update wallet
  UPDATE rider_wallets
  SET 
    balance = new_balance,
    lifetime_earnings = lifetime_earnings + p_rider_earning + p_bonus,
    weekly_earnings = weekly_earnings + p_rider_earning + p_bonus,
    weekly_orders = weekly_orders + 1,
    updated_at = NOW()
  WHERE rider_id = p_rider_id;

  -- 5. Update order status
  UPDATE orders
  SET 
    status = 'completed',
    rider_earning = p_rider_earning,
    commission = p_commission,
    completed_at = NOW()
  WHERE id = p_order_id;

  -- 6. Return summary
  RETURN jsonb_build_object(
    'success', true,
    'new_balance', new_balance,
    'bonus_earned', p_bonus,
    'weekly_orders', weekly_count + 1
  );
END;
$$ LANGUAGE plpgsql;
```

### Weekly Bonus Calculation (Automated)
```sql
-- Run every Monday at 00:00 via cron
CREATE OR REPLACE FUNCTION calculate_weekly_bonuses()
RETURNS VOID AS $$
BEGIN
  -- Credit bonus for top performers
  INSERT INTO wallet_transactions (wallet_id, amount, type, category, balance_after, description)
  SELECT 
    rider_id,
    CASE
      WHEN weekly_orders >= 50 THEN 2000
      WHEN weekly_orders >= 30 THEN 1000
      WHEN weekly_orders >= 20 THEN 500
      ELSE 0
    END AS bonus,
    'credit',
    'bonus',
    balance + bonus,
    'Weekly performance bonus'
  FROM rider_wallets
  WHERE weekly_orders >= 20;

  -- Update wallets
  UPDATE rider_wallets
  SET 
    balance = balance + (
      CASE
        WHEN weekly_orders >= 50 THEN 2000
        WHEN weekly_orders >= 30 THEN 1000
        WHEN weekly_orders >= 20 THEN 500
        ELSE 0
      END
    ),
    weekly_earnings = 0,
    weekly_orders = 0
  WHERE weekly_orders > 0;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 ANALYTICS ENHANCEMENT (Real-Time + AI)

### Server-Side Aggregation Functions

#### Real-Time Order Metrics
```sql
CREATE OR REPLACE FUNCTION get_realtime_order_metrics(p_period TEXT DEFAULT 'today')
RETURNS JSONB AS $$
DECLARE
  start_time TIMESTAMPTZ;
  result JSONB;
BEGIN
  -- Determine time range
  start_time := CASE p_period
    WHEN 'today' THEN DATE_TRUNC('day', NOW())
    WHEN 'week' THEN DATE_TRUNC('week', NOW())
    WHEN 'month' THEN DATE_TRUNC('month', NOW())
    ELSE NOW() - interval '1 day'
  END;

  -- Aggregate metrics
  SELECT jsonb_build_object(
    'total_orders', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'pending', COUNT(*) FILTER (WHERE status IN ('pending', 'assigned', 'picked_up')),
    'total_revenue', COALESCE(SUM(actual_fare) FILTER (WHERE status = 'completed'), 0),
    'total_commission', COALESCE(SUM(commission) FILTER (WHERE status = 'completed'), 0),
    'avg_order_value', COALESCE(AVG(actual_fare) FILTER (WHERE status = 'completed'), 0),
    'by_service', (
      SELECT jsonb_object_agg(service_type, cnt)
      FROM (
        SELECT service_type, COUNT(*) AS cnt
        FROM orders
        WHERE created_at >= start_time
        GROUP BY service_type
      ) t
    )
  ) INTO result
  FROM orders
  WHERE created_at >= start_time;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

#### Rider Performance Metrics
```sql
CREATE OR REPLACE FUNCTION get_rider_performance_metrics(p_period TEXT DEFAULT 'week')
RETURNS JSONB AS $$
DECLARE
  start_time TIMESTAMPTZ;
BEGIN
  start_time := CASE p_period
    WHEN 'today' THEN DATE_TRUNC('day', NOW())
    WHEN 'week' THEN DATE_TRUNC('week', NOW())
    WHEN 'month' THEN DATE_TRUNC('month', NOW())
    ELSE NOW() - interval '7 days'
  END;

  RETURN (
    SELECT jsonb_build_object(
      'total_riders', (SELECT COUNT(*) FROM rider_wallets WHERE status = 'active'),
      'total_payouts', COALESCE(SUM(rider_earning), 0),
      'avg_earning_per_order', COALESCE(AVG(rider_earning), 0),
      'top_performers', (
        SELECT jsonb_agg(row_to_json(t))
        FROM (
          SELECT 
            o.rider_id,
            r.name,
            COUNT(*) AS orders_completed,
            SUM(o.rider_earning) AS earnings,
            AVG(r.rating) AS avg_rating,
            AVG(EXTRACT(EPOCH FROM (o.completed_at - o.assigned_at))/60) AS avg_delivery_time_mins
          FROM orders o
          JOIN riders r ON r.id = o.rider_id
          WHERE o.status = 'completed' AND o.created_at >= start_time
          GROUP BY o.rider_id, r.name, r.rating
          ORDER BY COUNT(*) DESC
          LIMIT 10
        ) t
      )
    )
    FROM orders
    WHERE status = 'completed' AND created_at >= start_time
  );
END;
$$ LANGUAGE plpgsql;
```

---

## 🔐 BACKHAND GUARDRAILS

### 1. Server-Side Formula Protection
- All pricing formulas in PostgreSQL functions
- No client-side calculation allowed
- Edge Functions validate all inputs

### 2. Commission Floor Alert
```sql
CREATE OR REPLACE FUNCTION check_commission_floor()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.commission < (NEW.actual_fare * 0.10) THEN
    INSERT INTO audit_logs (action, entity_type, entity_id, new_value)
    VALUES ('low_commission_alert', 'order', NEW.id, 
            jsonb_build_object('commission', NEW.commission, 'fare', NEW.actual_fare));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_commission
  AFTER UPDATE OF commission ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_commission_floor();
```

### 3. Distance Validation
```sql
-- Prevent absurd distances (max 100km for Quetta)
ALTER TABLE orders ADD CONSTRAINT chk_distance_realistic
CHECK (distance_km > 0 AND distance_km < 100);
```

### 4. Atomic Wallet Updates
- All wallet operations use `FOR UPDATE` locks
- Ledger entries are append-only (no DELETE/UPDATE)
- Balance mismatch detection via cron

---

## 🔮 FUTURE-PROOF DYNAMIC PRICING

### AI-Powered Surge Detection
```sql
CREATE OR REPLACE FUNCTION calculate_dynamic_multiplier(
  p_zone TEXT,
  p_service_type TEXT,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS NUMERIC AS $$
DECLARE
  surge_val NUMERIC := 1.0;
  demand_count INT;
  active_riders INT;
BEGIN
  -- 1. Time-based (Peak Hours)
  IF EXTRACT(HOUR FROM p_timestamp) BETWEEN 12 AND 14 THEN
    surge_val := surge_val * 1.2;
  ELSIF EXTRACT(HOUR FROM p_timestamp) BETWEEN 19 AND 21 THEN
    surge_val := surge_val * 1.3;
  END IF;

  -- 2. Demand-based (Supply vs Demand)
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('pending', 'assigned')),
    (SELECT COUNT(*) FROM riders WHERE zone = p_zone AND is_online = true)
  INTO demand_count, active_riders
  FROM orders
  WHERE zone = p_zone AND created_at > NOW() - interval '30 minutes';

  IF active_riders > 0 AND (demand_count::FLOAT / active_riders) > 2.0 THEN
    surge_val := surge_val * 1.5;
  END IF;

  -- 3. Weather-based (Future: API integration)
  -- IF weather_api.is_rainy(p_zone) THEN surge_val := surge_val * 1.2; END IF;

  RETURN ROUND(surge_val, 2);
END;
$$ LANGUAGE plpgsql;
```

---

## 📈 ANOMALY DETECTION SYSTEM

```sql
CREATE OR REPLACE FUNCTION detect_anomalies()
RETURNS TABLE(alert_type TEXT, severity TEXT, message TEXT) AS $$
BEGIN
  -- 1. Negative profit orders
  RETURN QUERY
  SELECT 'negative_profit'::TEXT, 'critical'::TEXT, 
         'Order ' || id || ' has commission < 0'::TEXT
  FROM orders
  WHERE commission < 0 AND created_at > NOW() - interval '1 hour';

  -- 2. Unusual distances
  RETURN QUERY
  SELECT 'unusual_distance'::TEXT, 'warning'::TEXT,
         'Order ' || id || ' has distance > 50km'::TEXT
  FROM orders
  WHERE distance_km > 50 AND created_at > NOW() - interval '1 hour';

  -- 3. Delayed deliveries
  RETURN QUERY
  SELECT 'delayed_delivery'::TEXT, 'warning'::TEXT,
         'Order ' || id || ' pending for > 60 minutes'::TEXT
  FROM orders
  WHERE status IN ('pending', 'assigned') 
    AND created_at < NOW() - interval '60 minutes';
END;
$$ LANGUAGE plpgsql;
```

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
- [x] Pricing Plans Table
- [x] Rider Wallets Table
- [x] Wallet Transactions Ledger
- [ ] Enhanced Orders Table (add financial columns)
- [ ] Audit Logs Table
- [ ] Analytics Cache Table

### Phase 2: Core Logic (Week 3-4)
- [ ] Fare Estimation Engine
- [ ] Order Creation with Locked Fare
- [ ] Atomic Wallet Update Function
- [ ] Commission Calculation
- [ ] Bonus Logic

### Phase 3: Analytics (Week 5-6)
- [ ] Real-time Order Metrics
- [ ] Rider Performance Dashboard
- [ ] Financial Reports
- [ ] Heatmap Generation
- [ ] WebSocket Broadcasting

### Phase 4: AI & Automation (Week 7-8)
- [ ] Dynamic Surge Pricing
- [ ] Demand Prediction
- [ ] Anomaly Detection
- [ ] Weekly Bonus Automation
- [ ] Predictive Analytics

---

## ✅ PRODUCTION CHECKLIST

- [ ] All pricing formulas server-side only
- [ ] JWT authentication on all endpoints
- [ ] Rate limiting enabled (100 req/min per user)
- [ ] Database indexes optimized
- [ ] Atomic wallet transactions tested
- [ ] Audit logs capturing all admin actions
- [ ] Analytics cache invalidation strategy
- [ ] WebSocket scaling (Redis Pub/Sub)
- [ ] Load testing for 10k concurrent users
- [ ] Backup & disaster recovery plan
- [ ] GDPR compliance for user data
- [ ] Encrypted sensitive data (wallet balance, earnings)

---

**🦅 Autonomous. Scalable. Production-Ready.**

*Generated by Antigravity AI - Advanced Backend Architect*
