-- =====================================================
-- IMAGE STORAGE SYSTEM - COMPLETE FIX
-- =====================================================

-- 1. Create missing storage buckets for business and menu images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('business-images', 'business-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('menu-images', 'menu-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('profile-images', 'profile-images', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. RLS Policies for fasthaazirmanu bucket (existing - used for profile images)
-- Allow anyone to read (public bucket)
CREATE POLICY "Public read access for fasthaazirmanu"
ON storage.objects FOR SELECT
USING (bucket_id = 'fasthaazirmanu');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to fasthaazirmanu"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'fasthaazirmanu' 
  AND auth.uid() IS NOT NULL
);

-- Allow users to update their own uploads
CREATE POLICY "Users can update own files in fasthaazirmanu"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'fasthaazirmanu'
  AND auth.uid() IS NOT NULL
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own files in fasthaazirmanu"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'fasthaazirmanu'
  AND auth.uid() IS NOT NULL
);

-- 3. RLS Policies for profile-images bucket
CREATE POLICY "Public read access for profile-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload profile images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update own profile images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-images'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete own profile images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-images'
  AND auth.uid() IS NOT NULL
);

-- 4. RLS Policies for business-images bucket
CREATE POLICY "Public read access for business-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-images');

CREATE POLICY "Admins can upload business images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update business images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete business images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Business owners can also manage their business images
CREATE POLICY "Business owners can upload their business images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-images' 
  AND public.has_role(auth.uid(), 'business'::app_role)
);

CREATE POLICY "Business owners can update their business images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-images'
  AND public.has_role(auth.uid(), 'business'::app_role)
);

CREATE POLICY "Business owners can delete their business images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-images'
  AND public.has_role(auth.uid(), 'business'::app_role)
);

-- 5. RLS Policies for menu-images bucket
CREATE POLICY "Public read access for menu-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

CREATE POLICY "Admins can upload menu images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'menu-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update menu images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'menu-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete menu images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'menu-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Business owners can upload menu images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'menu-images' 
  AND public.has_role(auth.uid(), 'business'::app_role)
);

CREATE POLICY "Business owners can update menu images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'menu-images'
  AND public.has_role(auth.uid(), 'business'::app_role)
);

CREATE POLICY "Business owners can delete menu images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'menu-images'
  AND public.has_role(auth.uid(), 'business'::app_role)
);