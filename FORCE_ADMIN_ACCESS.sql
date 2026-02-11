-- ============================================================================
-- 🔧 FORCE ADMIN ACCESS - THE "KEY" TO GOD MODE
-- ============================================================================

-- 1. DELETE ANY CONFUSING ADMIN RECORDS
DELETE FROM admins WHERE email = 'zohaibhassen0@gmail.com';

-- 2. INSERT A FRESH, CLEAN ADMIN RECORD
INSERT INTO admins (user_id, email, name, phone, is_active)
SELECT 
  id, 
  email, 
  'Success Admin', 
  phone,
  TRUE
FROM auth.users
WHERE email = 'zohaibhassen0@gmail.com';

-- 3. THE "MAGIC" FUNCTION - ALWAYS ALLOW SERVICE_ROLE & AUTHENTICATED ADMIN
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  _role text;
  _is_admin_user boolean;
BEGIN
  -- Check current role (service_role is used by Supabase Dashboard)
  _role := current_setting('request.jwt.claim.role', true);

  -- Check if user exists in admins table (for App usage)
  SELECT EXISTS (
    SELECT 1 FROM admins 
    WHERE user_id = auth.uid() 
    AND is_active = TRUE
  ) INTO _is_admin_user;

  -- RETURN TRUE IF:
  -- 1. We are 'service_role' (Running in SQL Editor)
  -- 2. OR We are 'postgres' (Running in Database)
  -- 3. OR We are a logged-in admin user
  RETURN (
    _role = 'service_role' OR 
    current_user = 'postgres' OR 
    _is_admin_user
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. GRANT PERMISSIONS TO AUTHENTICATED USERS SO THEY CAN CALL IT
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- ============================================================================
-- VERIFICATION (RUN THIS!)
-- ============================================================================

-- This should NOW return TRUE
SELECT is_admin() as am_i_admin;

-- Also verify the admin record exists
SELECT * FROM admins WHERE email = 'zohaibhassen0@gmail.com';
