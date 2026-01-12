-- Drop the problematic policies causing recursion
DROP POLICY IF EXISTS "Customers can view their assigned rider" ON public.riders;
DROP POLICY IF EXISTS "Business owners can view assigned riders" ON public.riders;

-- Create a security definer function to check rider access
CREATE OR REPLACE FUNCTION public.can_view_rider(_rider_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Customer can view their assigned rider
    SELECT 1 FROM public.orders 
    WHERE rider_id = _rider_id AND customer_id = auth.uid()
    UNION
    SELECT 1 FROM public.rider_requests 
    WHERE rider_id = _rider_id AND customer_id = auth.uid()
    UNION
    -- Business owner can view assigned riders
    SELECT 1 FROM public.orders o
    JOIN public.businesses b ON o.business_id = b.id
    WHERE o.rider_id = _rider_id AND b.owner_user_id = auth.uid()
  )
$$;

-- Create simple non-recursive policy using the function
CREATE POLICY "Users can view their assigned rider"
ON public.riders
FOR SELECT
USING (public.can_view_rider(id));