-- Fix user_roles schema
-- Drop constraint if exists
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Ensure role column is using the ENUM type
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role 
  USING role::text::public.app_role;

-- Sync existing data again
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role::text::public.app_role
FROM public.profiles
WHERE user_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
