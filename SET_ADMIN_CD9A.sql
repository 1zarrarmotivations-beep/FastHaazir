-- ============================================================================
-- 🚀 GRANT SUPER ADMIN ACCESS TO UID: cd9a3940-393e-4831-affd-d4bc7e152b63
-- ============================================================================

-- 1. ADD TO ADMINS TABLE (With Unique Phone Placeholder)
DELETE FROM admins WHERE user_id = 'cd9a3940-393e-4831-affd-d4bc7e152b63';

INSERT INTO admins (user_id, email, name, phone, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', 'Admin CD9A'), 
  -- Use real phone if available, otherwise a UNIQUE placeholder based on first 8 chars of UID
  COALESCE(phone, '+92' || substring(id::text, 1, 8)), 
  TRUE
FROM auth.users
WHERE id = 'cd9a3940-393e-4831-affd-d4bc7e152b63';

-- 2. ASSIGN 'admin' ROLE
DELETE FROM user_roles WHERE user_id = 'cd9a3940-393e-4831-affd-d4bc7e152b63';

INSERT INTO user_roles (user_id, role)
VALUES ('cd9a3940-393e-4831-affd-d4bc7e152b63', 'admin'::app_role);

-- 3. VERIFY
SELECT 
  u.id, 
  u.phone,
  a.phone as admin_phone,
  r.role 
FROM auth.users u
LEFT JOIN admins a ON a.user_id = u.id
LEFT JOIN user_roles r ON r.user_id = u.id
WHERE u.id = 'cd9a3940-393e-4831-affd-d4bc7e152b63';
