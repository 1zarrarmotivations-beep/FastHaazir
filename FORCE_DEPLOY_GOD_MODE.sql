-- ============================================================================
-- 🚑 FORCE DEPLOYMENT - NO "ON CONFLICT" USED - GUARANTEED SUCCESS
-- ============================================================================

-- 1. DELETE EXISTING ADMIN (AVOIDS DUPLICATE ERROR)
DELETE FROM admins WHERE email = 'zohaibhassen0@gmail.com';

-- 2. INSERT FRESH ADMIN (SAFE INSERT)
INSERT INTO admins (user_id, email, name, phone, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', 'Super Admin'), 
  phone,
  TRUE
FROM auth.users
WHERE email = 'zohaibhassen0@gmail.com';

-- 3. ENSURE ADMIN ROLE (SAFE INSERT)
DELETE FROM user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'zohaibhassen0@gmail.com') AND role = 'admin';

INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'zohaibhassen0@gmail.com';

-- 4. CLEANUP DUPLICATES GLOBALLY (SAFETY)
DELETE FROM admins a USING admins b
WHERE a.id < b.id AND a.email = b.email;

-- 5. DEPLOY PERMISSION CHECK (Robust)
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

-- 6. DEPLOY GOD MODE FUNCTIONS (Super Powers)

CREATE OR REPLACE FUNCTION admin_adjust_wallet(p_rider_id UUID, p_amount NUMERIC, p_description TEXT DEFAULT 'Admin adjustment')
RETURNS JSONB AS $$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  
  -- Create wallet if missing (Safe Upsert)
  INSERT INTO rider_wallets (rider_id, balance) 
  SELECT p_rider_id, 0 
  WHERE NOT EXISTS (SELECT 1 FROM rider_wallets WHERE rider_id = p_rider_id);
  
  SELECT balance INTO current_balance FROM rider_wallets WHERE rider_id = p_rider_id FOR UPDATE;
  new_balance := current_balance + p_amount;

  INSERT INTO wallet_transactions (wallet_id, amount, type, category, balance_after, description) 
  VALUES (p_rider_id, p_amount, CASE WHEN p_amount > 0 THEN 'credit' ELSE 'debit' END, 'adjustment', new_balance, p_description);

  UPDATE rider_wallets SET balance = new_balance, updated_at = NOW() WHERE rider_id = p_rider_id;

  RETURN jsonb_build_object('success', TRUE, 'new_balance', new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_override_order_status(p_order_id UUID, p_new_status TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  UPDATE orders SET status = p_new_status, updated_at = NOW() WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_delete_order(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  DELETE FROM orders WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_toggle_rider_status(p_rider_id UUID, p_is_active BOOLEAN)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  UPDATE riders SET is_active = p_is_active, updated_at = NOW() WHERE id = p_rider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_toggle_business_status(p_business_id UUID, p_is_active BOOLEAN)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  UPDATE businesses SET is_active = p_is_active, updated_at = NOW() WHERE id = p_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT is_admin() as admin_access_restored;
