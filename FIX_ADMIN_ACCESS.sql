-- ============================================================================
-- FIX ADMIN ACCESS - Allow Service Role & Authenticated Admins
-- ============================================================================

-- First, ensure your admin account exists and is linked
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

-- Ensure admin has proper role
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'zohaibhassen0@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================================
-- UPDATED ADMIN FUNCTIONS (Works in SQL Editor + App)
-- ============================================================================

-- Updated admin check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Allow if service role (SQL Editor) OR authenticated admin
  RETURN (
    current_setting('role', true) = 'service_role' OR
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND is_active = TRUE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated wallet adjustment
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
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Lock wallet
  SELECT balance INTO current_balance
  FROM rider_wallets
  WHERE rider_id = p_rider_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rider wallet not found';
  END IF;

  new_balance := current_balance + p_amount;

  -- Insert transaction
  INSERT INTO wallet_transactions (
    wallet_id, amount, type, category, balance_after, description
  ) VALUES (
    p_rider_id,
    p_amount,
    CASE WHEN p_amount > 0 THEN 'credit' ELSE 'debit' END,
    'adjustment',
    new_balance,
    p_description
  );

  -- Update wallet
  UPDATE rider_wallets
  SET balance = new_balance, updated_at = NOW()
  WHERE rider_id = p_rider_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'previous_balance', current_balance,
    'adjustment', p_amount,
    'new_balance', new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated order status override
CREATE OR REPLACE FUNCTION admin_override_order_status(
  p_order_id UUID,
  p_new_status TEXT
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  UPDATE orders
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated order deletion
CREATE OR REPLACE FUNCTION admin_delete_order(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  DELETE FROM orders WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated rider toggle
CREATE OR REPLACE FUNCTION admin_toggle_rider_status(
  p_rider_id UUID,
  p_is_active BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  UPDATE riders
  SET is_active = p_is_active, updated_at = NOW()
  WHERE id = p_rider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated business toggle
CREATE OR REPLACE FUNCTION admin_toggle_business_status(
  p_business_id UUID,
  p_is_active BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  UPDATE businesses
  SET is_active = p_is_active, updated_at = NOW()
  WHERE id = p_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated pricing update
CREATE OR REPLACE FUNCTION admin_update_pricing(
  p_service_type TEXT,
  p_base_fare NUMERIC DEFAULT NULL,
  p_per_km_rate NUMERIC DEFAULT NULL,
  p_minimum_fare NUMERIC DEFAULT NULL,
  p_rider_per_km_rate NUMERIC DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  UPDATE pricing_plans
  SET 
    base_fare = COALESCE(p_base_fare, base_fare),
    per_km_rate = COALESCE(p_per_km_rate, per_km_rate),
    minimum_fare = COALESCE(p_minimum_fare, minimum_fare),
    rider_per_km_rate = COALESCE(p_rider_per_km_rate, rider_per_km_rate),
    updated_at = NOW()
  WHERE service_type = p_service_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated rating deletion
CREATE OR REPLACE FUNCTION admin_delete_rating(
  p_rating_id UUID,
  p_rating_type TEXT DEFAULT 'order'
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  IF p_rating_type = 'order' THEN
    DELETE FROM order_ratings WHERE id = p_rating_id;
  ELSE
    DELETE FROM product_ratings WHERE id = p_rating_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated complete user data
CREATE OR REPLACE FUNCTION admin_get_complete_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'user_id', p_user_id,
    'auth_user', (SELECT row_to_json(u.*) FROM auth.users u WHERE u.id = p_user_id),
    'rider_profile', (SELECT row_to_json(r.*) FROM riders r WHERE r.user_id = p_user_id),
    'admin_profile', (SELECT row_to_json(a.*) FROM admins a WHERE a.user_id = p_user_id),
    'wallet', (SELECT row_to_json(w.*) FROM rider_wallets w WHERE w.rider_id IN (SELECT id FROM riders WHERE user_id = p_user_id)),
    'orders_as_rider', (SELECT json_agg(o.*) FROM orders o WHERE o.rider_id IN (SELECT id FROM riders WHERE user_id = p_user_id)),
    'orders_as_customer', (SELECT json_agg(o.*) FROM orders o WHERE o.customer_id = p_user_id)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test admin check
SELECT is_admin() as am_i_admin;

-- Should return TRUE if you're running in SQL Editor or logged in as admin
