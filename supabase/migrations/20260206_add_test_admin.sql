-- Migration to add a new admin test account
-- This will ensure that when the user logs in with this email, they are assigned the 'admin' role.

-- 1. Ensure the email exists in the admins table (the allowlist for admins)
INSERT INTO public.admins (name, email, phone, is_active)
VALUES ('Zohaib Hassen', 'zohaibhassen0@gmail.com', '+920000000000', true)
ON CONFLICT (email) DO UPDATE 
SET name = EXCLUDED.name,
    is_active = true;

-- 2. Ensure that if the user already exists in user_roles, they are updated to admin
-- Note: This part requires the user's UUID, which we don't know yet. 
-- The public.resolve_role_by_email() function will handle the link automatically 
-- when the user logs in for the first time.
