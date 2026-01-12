-- Remove the overly permissive public SELECT policy on businesses table
-- This policy exposes owner_email and owner_phone to unauthenticated users
DROP POLICY IF EXISTS "Anyone can view active businesses basic info" ON public.businesses;

-- The public_business_info view already exists and excludes sensitive owner data
-- We just need to ensure the businesses table is not directly accessible to the public
-- Admins and business owners already have their own policies for full access