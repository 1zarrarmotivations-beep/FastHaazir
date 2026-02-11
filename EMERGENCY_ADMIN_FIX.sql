-- ============================================================================
-- 🚑 EMERGENCY ADMIN FIX - FORCE UNIQUE CONSTRAINT
-- ============================================================================

-- 1. CLEANUP DUPLICATES (Forceful)
-- Remove any duplicate emails, keeping the most recently updated/created one
DELETE FROM admins a USING admins b
WHERE a.id < b.id AND a.email = b.email;

-- 2. ENSURE CONSTRAINT EXISTS
-- Drop it first to be safe, then re-add it to ensure it catches the 'email' column
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_email_key;
DROP INDEX IF EXISTS admins_email_idx;

-- Add the unique constraint immediately
-- This IS REQUIRED for "ON CONFLICT (email)" to work
ALTER TABLE admins ADD CONSTRAINT admins_email_key UNIQUE (email);

-- 3. LINK ADMIN ACCOUNT
-- Now this will work because the constraint exists
INSERT INTO admins (user_id, email, name, phone, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', 'Admin'), 
  phone,
  TRUE
FROM auth.users
WHERE email = 'zohaibhassen0@gmail.com'
ON CONFLICT (email) 
DO UPDATE SET 
  user_id = EXCLUDED.user_id,
  is_active = TRUE,
  updated_at = NOW();

-- 4. ENSURE ADMIN ROLE
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'zohaibhassen0@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. DEPLOY PERMISSION CHECK FUNCTION
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Allow Service Role (Supabase SQL Editor)
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

-- 6. DEPLOY CORE ADMIN FUNCTIONS
-- Wallet Adjustment
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

-- Order Status Override
CREATE OR REPLACE FUNCTION admin_override_order_status(p_order_id UUID, p_new_status TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  UPDATE orders SET status = p_new_status, updated_at = NOW() WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Order Deletion
CREATE OR REPLACE FUNCTION admin_delete_order(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  DELETE FROM orders WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TEST VALIDATION
-- ============================================================================
SELECT is_admin() as admin_access_restored;
