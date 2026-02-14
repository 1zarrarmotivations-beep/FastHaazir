
-- Security and Functionality Fixes for Riders and Orders

-- 1. Fix Riders table policies
DROP POLICY IF EXISTS "Riders can view own profile" ON public.riders;
CREATE POLICY "Riders can view own profile" 
ON public.riders FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Riders can update own profile" ON public.riders;
CREATE POLICY "Riders can update own profile" 
ON public.riders FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- 2. Fix Orders table policies (Secure broad access)
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" 
ON public.orders FOR SELECT 
TO authenticated 
USING (
  auth.uid() = customer_id OR 
  rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
);

-- 3. Fix Rider Requests table policies (Secure broad access)
DROP POLICY IF EXISTS "Users view own requests" ON public.rider_requests;
CREATE POLICY "Users view own requests" 
ON public.rider_requests FOR SELECT 
TO authenticated 
USING (
  auth.uid() = customer_id OR 
  rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()) OR
  (status = 'placed' AND EXISTS (SELECT 1 FROM public.riders WHERE user_id = auth.uid() AND is_online = true))
);

-- 4. Ensure has_role function is robust
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role::text = _role
  ) OR EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = _user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
