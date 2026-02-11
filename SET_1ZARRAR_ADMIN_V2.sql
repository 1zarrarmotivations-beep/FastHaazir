-- ============================================================================
-- 🚀 GRANT SUPER ADMIN ACCESS TO: 1zarrarmotivations@gmail.com
-- ============================================================================

-- 1. ADD TO ADMINS TABLE (The source of truth for is_admin() check)
-- Uses DELETE/INSERT pattern to avoid conflict errors
DELETE FROM admins WHERE email = '1zarrarmotivations@gmail.com';

INSERT INTO admins (user_id, email, name, phone, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', 'Admin 1Zarrar'), 
  -- Use phone if available, otherwise a valid placeholder
  COALESCE(phone, '+920000000000'), 
  TRUE
FROM auth.users
WHERE email = '1zarrarmotivations@gmail.com';

-- 2. ASSIGN 'admin' ROLE (Required for frontend routing)
-- Clean up old roles first to be safe
DELETE FROM user_roles 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = '1zarrarmotivations@gmail.com');

INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = '1zarrarmotivations@gmail.com';

-- 3. ENSURE is_admin() FUNCTION RECOGNIZES THIS USER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Allow Service Role
    (current_setting('role', true) = 'service_role') 
    OR 
    -- Allow Postgres Role
    (current_user = 'postgres')
    OR
    -- Allow Authenticated Admin (Check against admins table)
    (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid() 
      AND is_active = TRUE
    ))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. VERIFY IT WORKED
SELECT 
  u.email, 
  CASE WHEN a.email IS NOT NULL THEN 'YES' ELSE 'NO' END as is_super_admin,
  r.role as assigned_role,
  a.phone as admin_phone
FROM auth.users u
LEFT JOIN admins a ON a.user_id = u.id
LEFT JOIN user_roles r ON r.user_id = u.id
WHERE u.email = '1zarrarmotivations@gmail.com';
