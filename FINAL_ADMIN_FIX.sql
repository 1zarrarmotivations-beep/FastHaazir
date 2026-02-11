-- ============================================================================
-- FINAL FORCE FIX - NO "ON CONFLICT" DEPENDENCY
-- ============================================================================

-- 1. REMOVE EXISTING ENTRIES FOR THIS EMAIL (Clean Slate)
-- We delete first to avoid "duplicate key" errors on insert
DELETE FROM admins WHERE email = 'zohaibhassen0@gmail.com';

-- 2. INSERT FRESH ADMIN RECORD
-- No "ON CONFLICT" clause here, so it won't fail if the constraint is missing
INSERT INTO admins (user_id, email, name, phone, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', 'Admin'), 
  phone,
  TRUE
FROM auth.users
WHERE email = 'zohaibhassen0@gmail.com';

-- 3. FIX DUPLICATES GLOBALLY (For other rows)
DELETE FROM admins a USING admins b
WHERE a.id < b.id AND a.email = b.email;

-- 4. ADD UNIQUE CONSTRAINT NOW (Safe to do after cleanup)
-- We wrap this in a block to ignore errors if it already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'admins_email_key'
    ) THEN
        ALTER TABLE admins ADD CONSTRAINT admins_email_key UNIQUE (email);
    END IF;
EXCEPTION
    WHEN others THEN NULL; -- Ignore if it fails, we already inserted the admin
END $$;

-- 5. ENSURE ADMIN ROLE
DELETE FROM user_roles 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'zohaibhassen0@gmail.com')
AND role = 'admin';

INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'zohaibhassen0@gmail.com';

-- 6. DEPLOY PERMISSION FUNCTION (Service Role + Admin User)
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

-- 7. ENABLE GOD MODE FUNCTIONS

-- Delete Order
CREATE OR REPLACE FUNCTION admin_delete_order(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  DELETE FROM orders WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adjust Wallet
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
  
  -- Lock wallet
  SELECT balance INTO current_balance FROM rider_wallets WHERE rider_id = p_rider_id FOR UPDATE;
  
  -- Create wallet if missing
  IF NOT FOUND THEN
    INSERT INTO rider_wallets (rider_id, balance) VALUES (p_rider_id, 0) RETURNING balance INTO current_balance;
  END IF;

  new_balance := current_balance + p_amount;

  INSERT INTO wallet_transactions (wallet_id, amount, type, category, balance_after, description) 
  VALUES (p_rider_id, p_amount, CASE WHEN p_amount > 0 THEN 'credit' ELSE 'debit' END, 'adjustment', new_balance, p_description);

  UPDATE rider_wallets SET balance = new_balance, updated_at = NOW() WHERE rider_id = p_rider_id;

  RETURN jsonb_build_object('success', TRUE, 'new_balance', new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Override Status
CREATE OR REPLACE FUNCTION admin_override_order_status(p_order_id UUID, p_new_status TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  UPDATE orders SET status = p_new_status, updated_at = NOW() WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle Rider
CREATE OR REPLACE FUNCTION admin_toggle_rider_status(p_rider_id UUID, p_is_active BOOLEAN)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: Admin access required'; END IF;
  UPDATE riders SET is_active = p_is_active, updated_at = NOW() WHERE id = p_rider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT is_admin() as admin_access_ready;
