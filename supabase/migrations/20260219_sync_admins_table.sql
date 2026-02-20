-- Ensure Admins Table Consistency
-- Insert missing admin records for users who have 'admin' or 'super_admin' role in profiles
INSERT INTO public.admins (user_id, is_active, created_at)
SELECT user_id, true, now()
FROM public.profiles
WHERE role IN ('admin', 'super_admin')
AND user_id NOT IN (SELECT user_id FROM public.admins)
AND user_id IS NOT NULL;

-- Log the count of fixed admins
DO $$
DECLARE
    _count int;
BEGIN
    SELECT count(*) INTO _count FROM public.profiles WHERE role IN ('admin', 'super_admin');
    RAISE NOTICE 'Total Admins/Super Admins in system: %', _count;
END $$;
