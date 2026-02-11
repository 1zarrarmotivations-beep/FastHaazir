-- ============================================================================
-- 🚀 FORCE ROLE RESOLUTION - NO "ON CONFLICT" ERROR
-- ============================================================================

-- 1. DELETE ANY DUPLICATE ROLES FOR THIS USER (Clean Slate)
DELETE FROM user_roles 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = '1zarrarmotivations@gmail.com');

-- 2. INSERT A FRESH "ADMIN" ROLE
INSERT INTO user_roles (user_id, role, is_blocked)
SELECT id, 'admin'::app_role, FALSE
FROM auth.users
WHERE email = '1zarrarmotivations@gmail.com';

-- 3. ENSURE ADMIN TABLE ENTRY EXISTS
DELETE FROM admins WHERE user_id IN (SELECT id FROM auth.users WHERE email = '1zarrarmotivations@gmail.com');

INSERT INTO admins (user_id, email, name, phone, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', 'Admin 1Zarrar'), 
  COALESCE(phone, '+920000000000'), 
  TRUE
FROM auth.users
WHERE email = '1zarrarmotivations@gmail.com';

-- 4. FIX ROLE RESOLUTION FUNCTION (Prioritize Admins!)
CREATE OR REPLACE FUNCTION resolve_role_by_email(_email text)
RETURNS TABLE (role public.app_role, is_blocked boolean) AS $$
BEGIN
  -- 1. Check Admins Table First (Highest Priority)
  IF EXISTS (SELECT 1 FROM admins a JOIN auth.users u ON u.id = a.user_id WHERE u.email = _email AND a.is_active = TRUE) THEN
    RETURN QUERY SELECT 'admin'::public.app_role, FALSE;
    RETURN;
  END IF;

  -- 2. Check User Roles Table
  IF EXISTS (SELECT 1 FROM user_roles ur JOIN auth.users u ON u.id = ur.user_id WHERE u.email = _email AND ur.role = 'admin') THEN
    RETURN QUERY SELECT 'admin'::public.app_role, FALSE;
    RETURN;
  END IF;

  -- 3. Check Business
  IF EXISTS (SELECT 1 FROM businesses b JOIN auth.users u ON u.id = b.owner_user_id WHERE u.email = _email AND b.is_active = TRUE) THEN
    RETURN QUERY SELECT 'business'::public.app_role, FALSE;
    RETURN;
  END IF;

  -- 4. Check Rider
  IF EXISTS (SELECT 1 FROM riders r JOIN auth.users u ON u.id = r.user_id WHERE u.email = _email AND r.is_active = TRUE) THEN
    RETURN QUERY SELECT 'rider'::public.app_role, FALSE;
    RETURN;
  END IF;

  -- 5. Default to Customer
  RETURN QUERY SELECT 'customer'::public.app_role, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. VERIFY
SELECT u.email, r.role 
FROM auth.users u 
JOIN user_roles r ON r.user_id = u.id 
WHERE u.email = '1zarrarmotivations@gmail.com';
