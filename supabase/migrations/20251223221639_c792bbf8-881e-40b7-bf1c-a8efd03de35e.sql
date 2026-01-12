-- Fix security definer view by dropping and recreating with security invoker
DROP VIEW IF EXISTS public.public_rider_info;

-- Recreate view with SECURITY INVOKER (default, but explicit)
CREATE VIEW public.public_rider_info 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  image,
  is_online,
  rating,
  total_trips,
  vehicle_type,
  current_location_lat,
  current_location_lng
FROM public.riders
WHERE is_active = true;

-- Grant access to the view
GRANT SELECT ON public.public_rider_info TO anon, authenticated;