-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Online riders are viewable by everyone" ON public.riders;

-- Create a more restrictive policy - only allow viewing riders assigned to user's orders
CREATE POLICY "Customers can view their assigned rider"
ON public.riders
FOR SELECT
USING (
  id IN (
    SELECT rider_id FROM public.orders WHERE customer_id = auth.uid()
  ) OR
  id IN (
    SELECT rider_id FROM public.rider_requests WHERE customer_id = auth.uid()
  )
);

-- Business owners can view riders assigned to their orders
CREATE POLICY "Business owners can view assigned riders"
ON public.riders
FOR SELECT
USING (
  id IN (
    SELECT o.rider_id FROM public.orders o
    JOIN public.businesses b ON o.business_id = b.id
    WHERE b.owner_user_id = auth.uid()
  )
);