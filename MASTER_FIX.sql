
-- MASTER FIX SCRIPT for FastHaazir (Storage + Permissions)

-- 1. Enable Storage Extenstion (just in case)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create 'avatars' bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Create 'rider-documents' bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('rider-documents', 'rider-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage Policies for 'avatars'
-- Allow public read
CREATE POLICY "Avatar Public Read"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload avatars
CREATE POLICY "Avatar Upload Auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- Allow users to update their own avatars
CREATE POLICY "Avatar Update Own"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = owner );

-- 5. Storage Policies for 'rider-documents'
-- Allow public read (for admin verification)
CREATE POLICY "Docs Public Read"
ON storage.objects FOR SELECT
USING ( bucket_id = 'rider-documents' );

-- Allow authenticated users (riders) to upload documents
CREATE POLICY "Docs Upload Auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'rider-documents' );

-- Allow ANYONE (including unauthenticated during signup) to upload if needed
-- (Optional: restrict this if auth is strictly required before upload)
CREATE POLICY "Docs Upload Anon"
ON storage.objects FOR INSERT
TO anon
WITH CHECK ( bucket_id = 'rider-documents' );


-- 6. Ensure RLS on tables won't block creation
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

-- Allow Service Role (Edge Function) full access implicitly (it bypasses RLS) but verify policies for basic users

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK ( auth.uid() = id );

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING ( auth.uid() = id );

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
USING ( auth.uid() = id );

-- Policy: Admins can do everything on profiles
CREATE POLICY "Admins full access profiles"
ON public.profiles FOR ALL
USING ( 
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);
