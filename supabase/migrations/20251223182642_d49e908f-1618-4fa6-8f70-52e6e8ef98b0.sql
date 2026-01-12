-- Allow riders to view all pending rider requests (not assigned yet)
CREATE POLICY "Riders can view pending requests"
ON public.rider_requests
FOR SELECT
USING (
  (status = 'placed' AND rider_id IS NULL) 
  OR rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
);

-- Allow riders to accept/update requests
CREATE POLICY "Riders can update assigned requests"
ON public.rider_requests
FOR UPDATE
USING (
  rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
  OR (status = 'placed' AND rider_id IS NULL)
);

-- Allow riders to update their own rider record
CREATE POLICY "Riders can update their own record"
ON public.riders
FOR UPDATE
USING (user_id = auth.uid());

-- Allow riders to view their own record
CREATE POLICY "Riders can view their own record"
ON public.riders
FOR SELECT
USING (user_id = auth.uid());

-- Allow users to register as riders
CREATE POLICY "Users can register as riders"
ON public.riders
FOR INSERT
WITH CHECK (user_id = auth.uid());