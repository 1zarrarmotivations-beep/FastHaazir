-- Fix RLS policies for production security

-- 1. Add policy for business owners to view their orders
CREATE POLICY "Business owners can view their orders"
ON public.orders
FOR SELECT
USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_user_id = auth.uid()
  )
);

-- 2. Add policy for business owners to update their orders
CREATE POLICY "Business owners can update their orders"
ON public.orders
FOR UPDATE
USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_user_id = auth.uid()
  )
);

-- 3. Add policy for riders to view assigned orders
CREATE POLICY "Riders can view assigned orders"
ON public.orders
FOR SELECT
USING (
  rider_id IN (
    SELECT id FROM riders WHERE user_id = auth.uid()
  )
);

-- 4. Add policy for riders to update assigned orders
CREATE POLICY "Riders can update assigned orders"
ON public.orders
FOR UPDATE
USING (
  rider_id IN (
    SELECT id FROM riders WHERE user_id = auth.uid()
  )
);

-- 5. Add UPDATE policy for chat messages (mark as read)
CREATE POLICY "Users can update their viewable messages"
ON public.chat_messages
FOR UPDATE
USING (
  (order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid()))
  OR
  (rider_request_id IN (SELECT id FROM rider_requests WHERE customer_id = auth.uid()))
  OR
  (order_id IN (
    SELECT o.id FROM orders o
    JOIN businesses b ON o.business_id = b.id
    WHERE b.owner_user_id = auth.uid()
  ))
  OR
  (order_id IN (
    SELECT id FROM orders WHERE rider_id IN (
      SELECT id FROM riders WHERE user_id = auth.uid()
    )
  ))
  OR
  (rider_request_id IN (
    SELECT id FROM rider_requests WHERE rider_id IN (
      SELECT id FROM riders WHERE user_id = auth.uid()
    )
  ))
);

-- 6. Create a view for public rider info (without sensitive data)
CREATE OR REPLACE VIEW public.public_rider_info AS
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