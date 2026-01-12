-- Drop and recreate views with SECURITY INVOKER (the secure default)
-- This ensures views respect the querying user's RLS policies

-- Recreate public_business_info view with SECURITY INVOKER
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

-- Recreate public_rider_info view with SECURITY INVOKER
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
FROM public.get_online_riders();

-- Grant SELECT on views to authenticated and anon roles for proper access
GRANT SELECT ON public.public_business_info TO authenticated, anon;
GRANT SELECT ON public.public_rider_info TO authenticated, anon;