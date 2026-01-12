-- Fix businesses table: Only owners/admins can access directly
DROP POLICY IF EXISTS "Authenticated users can view active businesses" ON public.businesses;

-- Recreate the public view with SECURITY DEFINER so it can access the table
DROP VIEW IF EXISTS public.public_business_info;
CREATE VIEW public.public_business_info 
WITH (security_barrier = true)
AS
SELECT 
  id, name, type, image, rating, eta, distance, 
  category, description, featured, is_active
FROM public.businesses
WHERE is_active = true;

-- Grant access to the view for everyone
GRANT SELECT ON public.public_business_info TO anon, authenticated;

-- Fix riders: Ensure customers can only see via secure view
DROP VIEW IF EXISTS public.public_rider_info;
CREATE VIEW public.public_rider_info 
WITH (security_barrier = true)
AS
SELECT 
  id, name, vehicle_type, rating, total_trips, 
  is_online, image, current_location_lat, current_location_lng
FROM public.riders
WHERE is_active = true AND is_online = true;

-- Grant access to the view
GRANT SELECT ON public.public_rider_info TO anon, authenticated;