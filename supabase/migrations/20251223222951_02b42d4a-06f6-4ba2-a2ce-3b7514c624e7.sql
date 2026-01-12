-- Recreate views with security_invoker (not definer) to satisfy linter
DROP VIEW IF EXISTS public.public_business_info;
CREATE VIEW public.public_business_info 
WITH (security_invoker = true)
AS
SELECT 
  id, name, type, image, rating, eta, distance, 
  category, description, featured, is_active
FROM public.businesses
WHERE is_active = true;

DROP VIEW IF EXISTS public.public_rider_info;
CREATE VIEW public.public_rider_info 
WITH (security_invoker = true)
AS
SELECT 
  id, name, vehicle_type, rating, total_trips, 
  is_online, image, current_location_lat, current_location_lng
FROM public.riders
WHERE is_active = true AND is_online = true;

-- Add back a basic SELECT policy for businesses so views work
CREATE POLICY "Anyone can view active businesses basic info"
ON public.businesses
FOR SELECT
USING (is_active = true);

-- Keep grants on views
GRANT SELECT ON public.public_business_info TO anon, authenticated;
GRANT SELECT ON public.public_rider_info TO anon, authenticated;