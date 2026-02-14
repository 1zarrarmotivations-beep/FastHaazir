-- Fix Storage Policies for rider-documents
-- Allow public read/write access to support rider registration flow

BEGIN;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Docs Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Docs Upload Any" ON storage.objects;
DROP POLICY IF EXISTS "Rider Docs Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Rider Docs Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Rider Docs Public Update" ON storage.objects;

-- Create comprehensive policies for rider-documents bucket
-- 1. Allow Public SELECT (Read)
CREATE POLICY "Rider Docs Public Select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'rider-documents');

-- 2. Allow Public INSERT (Upload)
-- This allows unauthenticated users (riders registering) to upload files
CREATE POLICY "Rider Docs Public Insert"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'rider-documents');

-- 3. Allow Public UPDATE (in case needed, though usually new files are uploaded)
CREATE POLICY "Rider Docs Public Update"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'rider-documents');

COMMIT;

-- Ensure riders table has the columns (Just a safety check, idempotent)
ALTER TABLE public.riders 
ADD COLUMN IF NOT EXISTS cnic_front TEXT,
ADD COLUMN IF NOT EXISTS cnic_back TEXT,
ADD COLUMN IF NOT EXISTS license_image TEXT;
