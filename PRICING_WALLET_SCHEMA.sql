-- ===================================================================================
-- SCALABLE PRICING & WALLET SYSTEM (FINTECH CORE)
-- Designed for Fast Haazir | Quetta | 2026
-- ===================================================================================

-- 1. CLEANUP (For fresh install)
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS rider_wallets CASCADE;
DROP TABLE IF EXISTS pricing_plans CASCADE;

-- 2. PRICING PLANS (Service-Level Config)
-- Stores the rates for Food, Grocery, Parcel.
-- Admins can update 'per_km_rate' without touching code.

CREATE TABLE pricing_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL UNIQUE CHECK (service_type IN ('food', 'grocery', 'parcel', 'p2p')),
  
  -- Base Fare Logic
  base_fare NUMERIC(10, 2) NOT NULL DEFAULT 50.00,        -- Starting price
  base_distance_km NUMERIC(10, 2) NOT NULL DEFAULT 2.0,   -- Km included in base fare
  
  -- Variable Pricing
  per_km_rate NUMERIC(10, 2) NOT NULL DEFAULT 15.00,      -- Charge per km after base
  per_min_rate NUMERIC(10, 2) NOT NULL DEFAULT 2.00,      -- Charge per min (optional)
  
  -- Guardrails
  minimum_fare NUMERIC(10, 2) NOT NULL DEFAULT 80.00,     -- Floor price
  
  -- Rider Payout Logic (Hardcoded split or Percentage)
  rider_commission_type TEXT DEFAULT 'percent' CHECK (rider_commission_type IN ('percent', 'fixed')),
  rider_commission_value NUMERIC(10, 2) DEFAULT 80.00,    -- e.g. 80% to rider
  
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Quetta Market Rates
INSERT INTO pricing_plans (service_type, base_fare, base_distance_km, per_km_rate, minimum_fare, rider_commission_value)
VALUES 
('food', 60.00, 2.0, 18.00, 90.00, 85.00),      -- Food is premium/quick
('grocery', 50.00, 2.0, 15.00, 80.00, 85.00),   -- Grocery slightly cheaper
('parcel', 70.00, 3.0, 20.00, 100.00, 90.00);   -- High value parcels

-- 3. RIDER WALLETS (Master Account)
-- Holds the balance for every rider. 1-to-1 with auth.users (riders).

CREATE TABLE rider_wallets (
  rider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  
  -- Financial State
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,         -- Withdrawable Cash
  pending_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Held for verification
  lifetime_earnings NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Reporting only
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'suspended')),
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WALLET TRANSACTIONS (The Ledger)
-- Immutable history of money movement. Never UPDATE or DELETE rows here.

CREATE TABLE wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES rider_wallets(rider_id) NOT NULL,
  order_id UUID REFERENCES orders(id), -- Nullable for manual adjustments/withdrawals (assuming orders table exists)
  
  -- Transaction Details
  amount NUMERIC(12, 2) NOT NULL,   -- Positive for Credit, Negative for Debit
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  category TEXT NOT NULL CHECK (category IN ('fare_earning', 'tip', 'bonus', 'withdrawal', 'adjustment', 'cash_collection')),
  
  -- Audit Trail
  balance_after NUMERIC(12, 2) NOT NULL, -- Snapshot of balance after this txn
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast history lookup
CREATE INDEX idx_wallet_tx_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_created_at ON wallet_transactions(created_at DESC);

-- ===================================================================================
-- SECURITY: ATOMIC TRANSACTION FUNCTION
-- ===================================================================================

-- Function to Process a Ride Completion (Credit Rider)
CREATE OR REPLACE FUNCTION process_ride_payment(
  p_rider_id UUID, 
  p_order_id UUID,
  p_amount NUMERIC, 
  p_category TEXT DEFAULT 'fare_earning' -- 'fare_earning' or 'tip'
)
RETURNS VOID AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  -- 1. Lock the wallet row for update (Prevents race conditions)
  SELECT balance INTO current_balance FROM rider_wallets WHERE rider_id = p_rider_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rider wallet not found for ID %', p_rider_id;
  END IF;

  -- 2. Insert into Ledger first
  INSERT INTO wallet_transactions (wallet_id, order_id, amount, type, category, balance_after, description)
  VALUES (
    p_rider_id, 
    p_order_id, 
    p_amount, 
    'credit', 
    p_category,
    current_balance + p_amount,
    'Earning for Order ' || p_order_id
  );
  
  -- 3. Update Actual Balance
  UPDATE rider_wallets 
  SET 
    balance = balance + p_amount,
    lifetime_earnings = lifetime_earnings + p_amount,
    updated_at = NOW()
  WHERE rider_id = p_rider_id;
  
END;
$$ LANGUAGE plpgsql;

-- Function to Process Cash Collection (Debit Rider)
-- If rider collects Cash on Delivery (COD), we reduce their digital wallet balance (they keep cash).
CREATE OR REPLACE FUNCTION process_cash_collection(
  p_rider_id UUID, 
  p_order_id UUID,
  p_cash_amount NUMERIC
)
RETURNS VOID AS $$
DECLARE
  current_balance NUMERIC;
  commission_amount NUMERIC; -- We deduct our commission from their wallet
BEGIN
  -- 1. Lock wallet
  SELECT balance INTO current_balance FROM rider_wallets WHERE rider_id = p_rider_id FOR UPDATE;
  
  -- 2. Calculate Commission (Simplified: Assume 15% platform fee for now, usually dynamic)
  -- In a real scenario, commission is passed in or calculated from `pricing_plans`.
  -- For this function, we assume the input `p_cash_amount` is the Total Cash Collected.
  -- The Rider keeps the cash. We debit (Commission + Restaurant Pay) from their wallet?
  -- OR simpler model: We debit the Total Cash Amount from their wallet balance.
  -- They now "owe" us that cash or it offsets their earnings.
  
  -- Model: Rider Wallet = (Earnings) - (Cash Collected)
  -- If Wallet is negative, they must deposit cash.
  
  -- Insert Ledger (Debit)
  INSERT INTO wallet_transactions (wallet_id, order_id, amount, type, category, balance_after, description)
  VALUES (
    p_rider_id, 
    p_order_id, 
    -p_cash_amount, -- Negative Amount
    'debit', 
    'cash_collection',
    current_balance - p_cash_amount,
    'Cash Collected for Order ' || p_order_id
  );
  
  -- Update Balance
  UPDATE rider_wallets 
  SET 
    balance = balance - p_cash_amount,
    updated_at = NOW()
  WHERE rider_id = p_rider_id;
  
END;
$$ LANGUAGE plpgsql;

-- ===================================================================================
-- ROW LEVEL SECURITY (RLS)
-- ===================================================================================

ALTER TABLE rider_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Riders view only their own wallet
CREATE POLICY "Riders view own wallet" ON rider_wallets
  FOR SELECT USING (auth.uid() = rider_id);

-- Riders view only their own transactions
CREATE POLICY "Riders view own transactions" ON wallet_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM rider_wallets WHERE rider_id = wallet_transactions.wallet_id AND rider_id = auth.uid())
  );

-- Admins view all (Assuming admin role check logic)
CREATE POLICY "Admins view all wallets" ON rider_wallets
  FOR ALL USING (
     EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

CREATE POLICY "Admins view all transactions" ON wallet_transactions
  FOR ALL USING (
     EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );
