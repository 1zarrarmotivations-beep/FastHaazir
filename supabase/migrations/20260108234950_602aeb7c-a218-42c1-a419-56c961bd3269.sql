-- Drop the existing view
DROP VIEW IF EXISTS public_rider_info;

-- Create a SECURITY DEFINER function to get public rider info
-- This bypasses RLS on the riders table for public rider info only
CREATE OR REPLACE FUNCTION get_online_riders()
RETURNS TABLE (
    id uuid,
    name text,
    vehicle_type text,
    rating numeric,
    total_trips integer,
    is_online boolean,
    image text,
    current_location_lat numeric,
    current_location_lng numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        r.vehicle_type,
        r.rating,
        r.total_trips,
        r.is_online,
        r.image,
        r.current_location_lat,
        r.current_location_lng
    FROM riders r
    WHERE r.is_active = true 
      AND r.is_online = true
      AND r.is_blocked = false;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_online_riders() TO authenticated;
GRANT EXECUTE ON FUNCTION get_online_riders() TO anon;

-- Recreate the view using the function (for backward compatibility)
CREATE VIEW public_rider_info AS
SELECT * FROM get_online_riders();

-- Also create a function to get ALL riders for admin purposes
CREATE OR REPLACE FUNCTION get_all_riders_for_map()
RETURNS TABLE (
    id uuid,
    name text,
    vehicle_type text,
    rating numeric,
    total_trips integer,
    is_online boolean,
    is_active boolean,
    image text,
    current_location_lat numeric,
    current_location_lng numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow admins to call this function
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied. Admin only.';
    END IF;
    
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        r.vehicle_type,
        r.rating,
        r.total_trips,
        r.is_online,
        r.is_active,
        r.image,
        r.current_location_lat,
        r.current_location_lng
    FROM riders r
    WHERE r.is_blocked = false;
END;
$$;

-- Grant execute permission to authenticated users (admin check is inside)
GRANT EXECUTE ON FUNCTION get_all_riders_for_map() TO authenticated;

-- Add a function to get a specific rider's public info by ID
CREATE OR REPLACE FUNCTION get_rider_public_info(rider_uuid uuid)
RETURNS TABLE (
    id uuid,
    name text,
    vehicle_type text,
    rating numeric,
    total_trips integer,
    is_online boolean,
    image text,
    current_location_lat numeric,
    current_location_lng numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        r.vehicle_type,
        r.rating,
        r.total_trips,
        r.is_online,
        r.image,
        r.current_location_lat,
        r.current_location_lng
    FROM riders r
    WHERE r.id = rider_uuid
      AND r.is_active = true
      AND r.is_blocked = false;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_rider_public_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_rider_public_info(uuid) TO anon;