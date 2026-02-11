
-- FAST HAAZIR - FULL SYSTEM POWER-UP
-- Run this in Supabase SQL Editor to enable Image Uploads and Admin Controls.

-- 1. STORAGE SECURITY (Allows you to upload images)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do anything with files
DROP POLICY IF EXISTS "Admin full control over storage" ON storage.objects;
CREATE POLICY "Admin full control over storage" ON storage.objects
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Everyone can view images (So they show up on the website)
DROP POLICY IF EXISTS "Public view images" ON storage.objects;
CREATE POLICY "Public view images" ON storage.objects
FOR SELECT TO public
USING (true);

-- 2. TABLE SECURITY (Fixes "Can't add Rider/Business" error)
DO $$ 
DECLARE t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admin full access" ON public.%I', t);
    -- We add "WITH CHECK" so you can actually INSERT new data
    EXECUTE format('CREATE POLICY "Admin full access" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))', t);
  END LOOP;
END $$;

-- 3. UI COMPATIBILITY (Add columns the forms are looking for)
ALTER TABLE IF EXISTS public.riders ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE IF EXISTS public.riders ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Quetta';
ALTER TABLE IF EXISTS public.riders ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE IF EXISTS public.riders ADD COLUMN IF NOT EXISTS cnic TEXT;

ALTER TABLE IF EXISTS public.businesses ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE IF EXISTS public.businesses ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Quetta';
ALTER TABLE IF EXISTS public.businesses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE IF EXISTS public.businesses ADD COLUMN IF NOT EXISTS description TEXT;
