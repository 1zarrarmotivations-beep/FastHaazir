-- ============================================================================
-- 🚀 GRANT ADMIN ACCESS TO NEW USER
-- Target: 1zarrarmotivations@gmail.com
-- ============================================================================

-- 1. ENSURE USER IS IN ADMINS TABLE
INSERT INTO admins (user_id, email, name, phone, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', 'Admin Zarrar'), 
  phone,
  TRUE
FROM auth.users
WHERE email = '1zarrarmotivations@gmail.com'
ON CONFLICT (email) 
DO UPDATE SET 
  user_id = EXCLUDED.user_id,
  is_active = TRUE,
  updated_at = NOW();

-- 2. ASSIGN ADMIN ROLE
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = '1zarrarmotivations@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. VERIFY ADMIN STATUS
SELECT 
  u.email, 
  a.is_active as admin_active,
  r.role
FROM auth.users u
LEFT JOIN admins a ON a.user_id = u.id
LEFT JOIN user_roles r ON r.user_id = u.id
WHERE u.email = '1zarrarmotivations@gmail.com';

-- ============================================================================
-- IF THIS RETURNS A ROW with role='admin', LOGIN WILL WORK!
-- ============================================================================
