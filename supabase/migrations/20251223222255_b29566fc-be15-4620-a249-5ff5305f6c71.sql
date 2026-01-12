-- Fix the Security Definer View issue by using security_invoker
DROP VIEW IF EXISTS public.public_business_info;

CREATE VIEW public.public_business_info 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  type,
  image,
  rating,
  eta,
  distance,
  category,
  description,
  featured,
  is_active
FROM public.businesses
WHERE is_active = true;

-- Also fix the public_rider_info view
DROP VIEW IF EXISTS public.public_rider_info;

CREATE VIEW public.public_rider_info 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  vehicle_type,
  rating,
  total_trips,
  is_online,
  image,
  current_location_lat,
  current_location_lng
FROM public.riders
WHERE is_active = true AND is_online = true;