-- ============================================================================
-- 🚀 GRANT SUPER ADMIN ACCESS TO UID: e7521b7e-0fb0-4d1a-8bb2-4393f0f1d685
-- ============================================================================

-- 1. ADD TO ADMINS TABLE (The source of truth for is_admin() check)
-- Clean up any existing admin record for this user first
DELETE FROM admins WHERE user_id = 'e7521b7e-0fb0-4d1a-8bb2-4393f0f1d685';

INSERT INTO admins (user_id, email, name, phone, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', 'Admin UID e752'), 
  -- Use phone if available, otherwise a valid placeholder
  COALESCE(phone, '+920000000000'), 
  TRUE
FROM auth.users
WHERE id = 'e7521b7e-0fb0-4d1a-8bb2-4393f0f1d685';

-- 2. ASSIGN 'admin' ROLE (Required for frontend routing)
-- Clean up old roles first
DELETE FROM user_roles WHERE user_id = 'e7521b7e-0fb0-4d1a-8bb2-4393f0f1d685';

INSERT INTO user_roles (user_id, role)
VALUES ('e7521b7e-0fb0-4d1a-8bb2-4393f0f1d685', 'admin'::app_role);

-- 3. ENSURE is_admin() FUNCTION RECOGNIZES THIS USER
-- (Redeploying robust function just in case)
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
  u.id,
  u.email, 
  CASE WHEN a.user_id IS NOT NULL THEN 'YES' ELSE 'NO' END as is_super_admin,
  r.role as assigned_role
FROM auth.users u
LEFT JOIN admins a ON a.user_id = u.id
LEFT JOIN user_roles r ON r.user_id = u.id
WHERE u.id = 'e7521b7e-0fb0-4d1a-8bb2-4393f0f1d685';

-- Should return:
-- id: e7521b7e-0fb0-4d1a-8bb2-4393f0f1d685
-- is_super_admin: YES
-- assigned_role: admin
