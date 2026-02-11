-- ============================================================================
-- FIX ADMIN ACCESS FINAL - Constraints, Permissions & Functions
-- ============================================================================

-- 1. SAFE CLEANUP & CONSTRAINTS
-- ============================================================================

-- Remove duplicate admin entries by email (keep the latest one)
DELETE FROM admins a USING admins b
WHERE a.id < b.id AND a.email = b.email;

-- Add Unique Constraint on Email (Safely)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'admins'::regclass 
        AND conname = 'admins_email_key'
    ) THEN
        -- Check if any unique index exists on email before adding constraint
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'admins' 
            AND indexdef LIKE '%(email)%'
        ) THEN
            ALTER TABLE admins ADD CONSTRAINT admins_email_key UNIQUE (email);
        END IF;
    END IF;
END $$;

-- 2. LINK ADMIN ACCOUNT
-- ============================================================================

-- Insert or Update the admin user
INSERT INTO admins (user_id, email, name, phone, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', 'Admin'), 
  phone,
  TRUE
FROM auth.users
WHERE email = 'zohaibhassen0@gmail.com'
-- Now this will work because we added the unique constraint/index
ON CONFLICT (email) 
DO UPDATE SET 
  user_id = EXCLUDED.user_id,
  is_active = TRUE,
  updated_at = NOW();

-- Ensure admin role exists
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'zohaibhassen0@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. UPDATED PERMISSION FUNCTIONS (Service Role + Admin User)
-- ============================================================================

-- Check if user is admin (or if running in SQL Editor)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Allow Service Role (Supabase SQL Editor uses this)
    (current_setting('role', true) = 'service_role') 
    OR 
    -- Allow Authenticated Admin User
    (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid() 
      AND is_active = TRUE
    ))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RE-APPLY ADMIN FUNCTIONS WITH NEW CHECK
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_adjust_wallet(
  p_rider_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT 'Admin adjustment'
)
RETURNS JSONB AS $$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;

  SELECT balance INTO current_balance FROM rider_wallets WHERE rider_id = p_rider_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rider wallet not found'; END IF;

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

CREATE OR REPLACE FUNCTION admin_update_pricing(p_service_type TEXT, p_base_fare NUMERIC, p_per_km_rate NUMERIC, p_minimum_fare NUMERIC, p_rider_per_km_rate NUMERIC)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  UPDATE pricing_plans 
  SET base_fare = p_base_fare, per_km_rate = p_per_km_rate, minimum_fare = p_minimum_fare, rider_per_km_rate = p_rider_per_km_rate, updated_at = NOW()
  WHERE service_type = p_service_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
-- VERIFICATION
-- ============================================================================
SELECT is_admin() as is_admin_access_working;
