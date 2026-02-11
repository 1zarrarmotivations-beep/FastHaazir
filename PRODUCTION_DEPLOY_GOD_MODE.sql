-- ============================================================================
-- 🚀 PRODUCTION DEPLOYMENT: GOD MODE + BUG FIXES
-- ============================================================================

-- 1. CLEANUP & FIX DUPLICATES (CRITICAL)
-- ============================================================================

-- Force remove duplicate admin emails
DELETE FROM admins a USING admins b
WHERE a.id < b.id AND a.email = b.email;

-- Add UNIQUE constraint (if missing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admins_email_key') THEN
        ALTER TABLE admins ADD CONSTRAINT admins_email_key UNIQUE (email);
    END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2. ENSURE ADMIN ACCESS (ROBUST)
-- ============================================================================

-- Ensure current user is admin
INSERT INTO admins (user_id, email, name, phone, is_active)
SELECT id, email, COALESCE(raw_user_meta_data->>'name', 'Super Admin'), phone, TRUE
FROM auth.users
WHERE email = 'zohaibhassen0@gmail.com'
ON CONFLICT (email) DO UPDATE 
SET user_id = EXCLUDED.user_id, is_active = TRUE, updated_at = NOW();

-- Ensure 'admin' role
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'zohaibhassen0@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. DEPLOY PERMISSION CHECK (SQL EDITOR + APP SUPPORT)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Allow Service Role (Supabase Dashboard)
    (current_setting('role', true) = 'service_role') 
    OR 
    -- Allow Postgres Role (Database Owner)
    (current_user = 'postgres')
    OR
    -- Allow Authenticated Admin User (App Login)
    (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid() 
      AND is_active = TRUE
    ))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions explicitly
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- 4. DEPLOY GOD MODE FUNCTIONS (SUPER POWERS)
-- ============================================================================

-- Wallet Adjustment
CREATE OR REPLACE FUNCTION admin_adjust_wallet(p_rider_id UUID, p_amount NUMERIC, p_description TEXT DEFAULT 'Admin adjustment')
RETURNS JSONB AS $$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  
  -- Create wallet if missing
  INSERT INTO rider_wallets (rider_id, balance) VALUES (p_rider_id, 0) ON CONFLICT (rider_id) DO NOTHING;
  
  SELECT balance INTO current_balance FROM rider_wallets WHERE rider_id = p_rider_id FOR UPDATE;
  new_balance := current_balance + p_amount;

  INSERT INTO wallet_transactions (wallet_id, amount, type, category, balance_after, description) 
  VALUES (p_rider_id, p_amount, CASE WHEN p_amount > 0 THEN 'credit' ELSE 'debit' END, 'adjustment', new_balance, p_description);

  UPDATE rider_wallets SET balance = new_balance, updated_at = NOW() WHERE rider_id = p_rider_id;

  RETURN jsonb_build_object('success', TRUE, 'new_balance', new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Override Order Status
CREATE OR REPLACE FUNCTION admin_override_order_status(p_order_id UUID, p_new_status TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  UPDATE orders SET status = p_new_status, updated_at = NOW() WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete Order
CREATE OR REPLACE FUNCTION admin_delete_order(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  DELETE FROM orders WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle Rider Status
CREATE OR REPLACE FUNCTION admin_toggle_rider_status(p_rider_id UUID, p_is_active BOOLEAN)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  UPDATE riders SET is_active = p_is_active, updated_at = NOW() WHERE id = p_rider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle Business Status
CREATE OR REPLACE FUNCTION admin_toggle_business_status(p_business_id UUID, p_is_active BOOLEAN)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  UPDATE businesses SET is_active = p_is_active, updated_at = NOW() WHERE id = p_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Pricing
CREATE OR REPLACE FUNCTION admin_update_pricing(p_service_type TEXT, p_base_fare NUMERIC, p_per_km_rate NUMERIC, p_minimum_fare NUMERIC, p_rider_per_km_rate NUMERIC)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  UPDATE pricing_plans 
  SET base_fare = p_base_fare, per_km_rate = p_per_km_rate, minimum_fare = p_minimum_fare, rider_per_km_rate = p_rider_per_km_rate, updated_at = NOW()
  WHERE service_type = p_service_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete Rating
CREATE OR REPLACE FUNCTION admin_delete_rating(p_rating_id UUID, p_rating_type TEXT DEFAULT 'order')
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  IF p_rating_type = 'order' THEN
    DELETE FROM order_ratings WHERE id = p_rating_id;
  ELSE
    DELETE FROM product_ratings WHERE id = p_rating_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Complete User Data
CREATE OR REPLACE FUNCTION admin_get_complete_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE result JSONB;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  SELECT jsonb_build_object(
    'user_id', p_user_id,
    'rider_profile', (SELECT row_to_json(r.*) FROM riders r WHERE r.user_id = p_user_id),
    'wallet', (SELECT row_to_json(w.*) FROM rider_wallets w WHERE w.rider_id IN (SELECT id FROM riders WHERE user_id = p_user_id))
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

SELECT is_admin() as deployment_success;
