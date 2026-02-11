-- ============================================================================
-- 👑 SET CORRECT ADMIN: zarrarmotivations@gmail.com
-- ============================================================================

-- 1. ADD TO ADMINS TABLE
INSERT INTO admins (user_id, email, name, phone, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', 'Admin Zarrar'), 
  phone,
  TRUE
FROM auth.users
WHERE email = 'zarrarmotivations@gmail.com'
ON CONFLICT (email) 
DO UPDATE SET 
  user_id = EXCLUDED.user_id,
  is_active = TRUE,
  updated_at = NOW();

-- 2. ASSIGN ADMIN ROLE
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'zarrarmotivations@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. ENSURE PERMISSIONS
-- The existing is_admin() function checks the 'admins' table, so adding the row above is sufficient.
-- But let's double check authorization just in case.

GRANT ALL ON TABLE admins TO authenticated;
GRANT ALL ON TABLE admins TO service_role;

-- 4. VERIFY
SELECT email, 'IS NOW ADMIN' as status 
FROM admins 
WHERE email = 'zarrarmotivations@gmail.com';
