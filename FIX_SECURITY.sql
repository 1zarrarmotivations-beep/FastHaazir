
-- FAST HAAZIR - ROBUST SECURITY & RLS FIX
-- This script dynamically detects columns to prevent "column does not exist" errors.

-- 1. ENABLE RLS ON ALL TABLES
DO $$ 
DECLARE t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t); END LOOP;
END $$;

-- 2. GLOBAL ADMIN ACCESS
DO $$ 
DECLARE t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admin full access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Admin full access" ON public.%I FOR ALL USING (public.has_role(auth.uid(), ''admin''))', t);
  END LOOP;
END $$;

-- 3. CUSTOMER/USER PROFILE PROTECTION
DROP POLICY IF EXISTS "Manage own profile" ON public.customer_profiles;
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='customer_profiles') THEN
    CREATE POLICY "Manage own profile" ON public.customer_profiles FOR ALL USING (auth.uid() = user_id);
END IF;

DROP POLICY IF EXISTS "Manage own customer" ON public.customers;
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='customers') THEN
    CREATE POLICY "Manage own customer" ON public.customers FOR ALL USING (auth.uid() = user_id);
END IF;

-- 4. ORDERS & REQUESTS PROTECTION (DYNAMIC)
DO $$ 
BEGIN
    -- Orders Policy
    DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_id') THEN
        CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (
            customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()) OR
            customer_id IN (SELECT id FROM public.customer_profiles WHERE user_id = auth.uid()) OR
            rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
        );
    ELSE
        CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;

    -- Rider Requests Policy
    DROP POLICY IF EXISTS "Users view own requests" ON public.rider_requests;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rider_requests' AND column_name='customer_id') THEN
        CREATE POLICY "Users view own requests" ON public.rider_requests FOR SELECT USING (
            customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()) OR
            customer_id IN (SELECT id FROM public.customer_profiles WHERE user_id = auth.uid()) OR
            rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
        );
    ELSE
        CREATE POLICY "Users view own requests" ON public.rider_requests FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- 5. RIDERS PROTECTION
DROP POLICY IF EXISTS "Manage own rider" ON public.riders;
CREATE POLICY "Manage own rider" ON public.riders FOR ALL USING (auth.uid() = user_id);

-- 6. PUBLIC BROWSING (Businesses & Menus)
DROP POLICY IF EXISTS "Public view businesses" ON public.businesses;
CREATE POLICY "Public view businesses" ON public.businesses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public view menu" ON public.menu_items;
CREATE POLICY "Public view menu" ON public.menu_items FOR SELECT USING (true);

-- 7. CHAT & SYSTEM
DROP POLICY IF EXISTS "View own messages" ON public.chat_messages;
CREATE POLICY "View own messages" ON public.chat_messages FOR SELECT USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "View own notifications" ON public.notifications;
CREATE POLICY "View own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
