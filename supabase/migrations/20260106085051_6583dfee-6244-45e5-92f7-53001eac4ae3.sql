-- Allow riders to view unassigned orders (placed/preparing status with no rider)
CREATE POLICY "Riders can view unassigned orders"
ON public.orders
FOR SELECT
USING (
  ((status IN ('placed', 'preparing')) AND (rider_id IS NULL) AND 
   EXISTS (SELECT 1 FROM riders WHERE riders.user_id = auth.uid() AND riders.is_online = true AND riders.is_active = true))
);

-- Allow riders to accept/update unassigned orders
CREATE POLICY "Riders can accept unassigned orders"
ON public.orders
FOR UPDATE
USING (
  ((status IN ('placed', 'preparing')) AND (rider_id IS NULL) AND 
   EXISTS (SELECT 1 FROM riders WHERE riders.user_id = auth.uid() AND riders.is_online = true AND riders.is_active = true))
);