-- ============================================================================
-- 🚀 FORCE ROLE RESOLUTION FIX - NO MORE STUCK ON CUSTOMER
-- ============================================================================

-- 1. DROP OLD FUNCTIONS (Clean Start)
DROP FUNCTION IF EXISTS resolve_role_by_email(text);
DROP FUNCTION IF EXISTS resolve_role_by_phone(text);

-- 2. CREATE ROBUST ROLE RESOLVER (Check Admin First!)
CREATE OR REPLACE FUNCTION resolve_role_by_email(_email text)
RETURNS TABLE (role text, is_blocked boolean) AS $$
BEGIN
  -- 1. Check Admins Table First (Highest Priority)
  IF EXISTS (SELECT 1 FROM admins a JOIN auth.users u ON u.id = a.user_id WHERE u.email = _email AND a.is_active = TRUE) THEN
    RETURN QUERY SELECT 'admin'::text, FALSE;
    RETURN;
  END IF;

  -- 2. Check User Roles Table (Manual Overrides)
  IF EXISTS (SELECT 1 FROM user_roles ur JOIN auth.users u ON u.id = ur.user_id WHERE u.email = _email AND ur.role = 'admin') THEN
    RETURN QUERY SELECT 'admin'::text, FALSE;
    RETURN;
  END IF;

  -- 3. Check Business Owners
  IF EXISTS (SELECT 1 FROM businesses b JOIN auth.users u ON u.id = b.owner_user_id WHERE u.email = _email AND b.is_active = TRUE) THEN
    RETURN QUERY SELECT 'business'::text, FALSE;
    RETURN;
  END IF;

  -- 4. Check Riders
  IF EXISTS (SELECT 1 FROM riders r JOIN auth.users u ON u.id = r.user_id WHERE u.email = _email AND r.is_active = TRUE) THEN
    RETURN QUERY SELECT 'rider'::text, FALSE;
    RETURN;
  END IF;

  -- 5. Default to Customer
  RETURN QUERY SELECT 'customer'::text, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREATE ROBUST UID RESOLVER (For Google Logins)
CREATE OR REPLACE FUNCTION get_user_role(_user_id uuid)
RETURNS text AS $$
DECLARE
  _role text;
BEGIN
  -- Check Admin
  IF EXISTS (SELECT 1 FROM admins WHERE user_id = _user_id AND is_active = TRUE) THEN
    RETURN 'admin';
  END IF;

  -- Check User Roles
  SELECT role INTO _role FROM user_roles WHERE user_id = _user_id;
  IF _role IS NOT NULL THEN
    RETURN _role::text;
  END IF;

  -- Check Business
  IF EXISTS (SELECT 1 FROM businesses WHERE owner_user_id = _user_id) THEN
    RETURN 'business';
  END IF;

  -- Check Rider
  IF EXISTS (SELECT 1 FROM riders WHERE user_id = _user_id) THEN
    RETURN 'rider';
  END IF;

  RETURN 'customer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FORCE UPDATE YOUR SPECIFIC USER ROLE TO 'admin'
-- (Replace UID with yours if needed, but this updates by email too)
UPDATE user_roles
SET role = 'admin'::app_role
WHERE user_id IN (SELECT id FROM auth.users WHERE email = '1zarrarmotivations@gmail.com');

INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = '1zarrarmotivations@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
