-- Safest Fix: Relax constraints without breaking policies
-- 1. Drop dependent view
DROP VIEW IF EXISTS public.user_role_debug;

-- 2. Clean up user_roles constraints
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- 3. Add new check constraint that allows super_admin (keeping column as TEXT)
ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_role_check 
  CHECK (role IN ('super_admin', 'admin', 'rider', 'business', 'customer'));

-- 4. Recreate View (Same logic)
CREATE OR REPLACE VIEW public.user_role_debug AS
 SELECT u.id AS user_id,
    u.email,
    u.phone,
    COALESCE((a.id IS NOT NULL), false) AS is_admin_record,
    COALESCE((r.id IS NOT NULL), false) AS is_rider_record,
    COALESCE(a.is_active, true) AS admin_active,
    COALESCE(r.is_active, true) AS rider_active,
    array_agg(DISTINCT ur.role) FILTER (WHERE (ur.role IS NOT NULL)) AS user_roles,
        CASE
            WHEN ((a.id IS NOT NULL) AND (a.is_active = true)) THEN 'admin'::text
            WHEN ((r.id IS NOT NULL) AND (r.is_active = true)) THEN 'rider'::text
            ELSE 'customer'::text
        END AS effective_role,
        CASE
            WHEN ((a.id IS NOT NULL) AND (a.is_active = false)) THEN 'admin_blocked'::text
            WHEN ((r.id IS NOT NULL) AND (r.is_active = false)) THEN 'rider_blocked'::text
            ELSE 'active'::text
        END AS status
   FROM (((auth.users u
     LEFT JOIN public.admins a ON ((a.user_id = u.id)))
     LEFT JOIN public.riders r ON ((r.user_id = u.id)))
     LEFT JOIN public.user_roles ur ON ((ur.user_id = u.id)))
  GROUP BY u.id, u.email, u.phone, a.id, a.is_active, r.id, r.is_active;

-- 5. Sync Data Final
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role
FROM public.profiles
WHERE user_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
