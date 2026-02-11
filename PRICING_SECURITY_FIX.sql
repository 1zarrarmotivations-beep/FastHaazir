-- ===================================================================================
-- SECURITY FIX: PRICING PLANS ACCESS
-- ===================================================================================

-- Enable RLS on pricing plans
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Policy (Vital for Frontend Calculator)
-- Allows any user (auth or anon) to read active pricing plans
CREATE POLICY "Public read active pricing plans" ON pricing_plans
  FOR SELECT USING (is_active = TRUE);

-- 2. Admin Manage Policy
-- Allows admins to update rates
CREATE POLICY "Admins manage pricing plans" ON pricing_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- ===================================================================================
-- WALLET SETUP TRIGGER
-- Automatically create a wallet when a user becomes a Rider
-- ===================================================================================

CREATE OR REPLACE FUNCTION create_rider_wallet()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the new user is a rider (assuming user_metadata or role check)
  -- For now, we'll just create it if it doesn't exist for ANY user to be safe, 
  -- or rely on the specific 'rider' role check if available.
  
  -- Safer: Insert if not exists
  INSERT INTO rider_wallets (rider_id, balance)
  VALUES (NEW.id, 0.00)
  ON CONFLICT (rider_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on auth.users (Be careful with this, usually managed via a profile trigger)
-- If you have a 'profiles' or 'riders' table, trigger there instead.
-- Assuming 'riders' table might not exist yet, we will skip the auto-trigger for now 
-- and rely on the Admin "Approve Rider" flow to create the wallet.

-- Manual Wallet Creation Function (safe to run)
CREATE OR REPLACE FUNCTION ensure_wallet_exists(p_rider_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO rider_wallets (rider_id, balance)
  VALUES (p_rider_id, 0.00)
  ON CONFLICT (rider_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
