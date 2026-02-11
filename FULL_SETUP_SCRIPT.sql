-- ============================================================================
-- FAST HAAZIR - COMPLETE DATABASE SETUP (Composite Script)
-- Generated: February 10, 2026
-- ============================================================================

-- ============================================================================
-- PART 1: ENUMS (Data Types)
-- ============================================================================

-- Business types
CREATE TYPE public.business_type AS ENUM ('restaurant', 'bakery', 'grocery', 'shop');

-- Order status
CREATE TYPE public.order_status AS ENUM ('placed', 'preparing', 'on_way', 'delivered', 'cancelled');

-- App roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'business', 'rider', 'customer');

-- ============================================================================
-- PART 2: CORE TABLES
-- ============================================================================

-- 2.1 Businesses Table
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type business_type NOT NULL DEFAULT 'restaurant',
  image TEXT,
  rating DECIMAL(2,1) DEFAULT 4.5,
  eta TEXT DEFAULT '25-35 min',
  distance TEXT DEFAULT '1.0 km',
  category TEXT,
  description TEXT,
  featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  owner_phone TEXT,
  owner_user_id UUID,
  commission_rate NUMERIC DEFAULT 15,
  claimed BOOLEAN DEFAULT false,
  address TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.2 Menu Items Table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  image TEXT,
  category TEXT,
  description TEXT,
  is_popular BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.3 Riders Table
CREATE TABLE public.riders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  cnic TEXT,
  vehicle_type TEXT DEFAULT 'Bike',
  rating DECIMAL(2,1) DEFAULT 4.5,
  total_trips INTEGER DEFAULT 0,
  is_online BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  current_location_lat DECIMAL(10,7),
  current_location_lng DECIMAL(10,7),
  image TEXT,
  commission_rate NUMERIC DEFAULT 10,
  claimed BOOLEAN DEFAULT false,
  wallet_balance INTEGER DEFAULT 0,
  fcm_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.4 Orders Table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_phone TEXT,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  business_name TEXT,
  rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'placed',
  items JSONB NOT NULL DEFAULT '[]',
  subtotal INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER NOT NULL DEFAULT 150,
  total INTEGER NOT NULL DEFAULT 0,
  delivery_address TEXT,
  dropoff_lat DECIMAL(10,7),
  dropoff_lng DECIMAL(10,7),
  dropoff_address TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.5 Rider Requests Table (For on-demand package delivery)
CREATE TABLE public.rider_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_phone TEXT,
  rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'placed', -- Reusing order_status for simplicity: placed/preparing/on_way/delivered/cancelled
  description TEXT,
  total INTEGER NOT NULL DEFAULT 0,
  pickup_lat DECIMAL(10,7) NOT NULL,
  pickup_lng DECIMAL(10,7) NOT NULL,
  pickup_address TEXT NOT NULL,
  dropoff_lat DECIMAL(10,7) NOT NULL,
  dropoff_lng DECIMAL(10,7) NOT NULL,
  dropoff_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.6 Rider Payments Table
CREATE TABLE public.rider_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rider_request_id UUID REFERENCES public.rider_requests(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'order_fee', 'withdrawal', 'bonus', 'penalty'
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'pending_withdrawal', 'processed'
  rider_lat DECIMAL(10,7),
  rider_lng DECIMAL(10,7),
  customer_lat DECIMAL(10,7),
  customer_lng DECIMAL(10,7),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- PART 2.5: ROLE MAPPING & ADMIN TABLES (Missing from initial chunk but needed for auth)
-- ============================================================================

-- Table to explicitly store application role for users authenticated via Firebase/Supabase
CREATE TABLE public.user_roles (
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id)
);

-- Table for explicit Admin users (for easier querying/permissions)
CREATE TABLE public.admins (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Super Admin',
  phone TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table for explicit Customer profiles (for name/profile picture persistence)
CREATE TABLE public.customer_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT UNIQUE,
  phone_verified BOOLEAN DEFAULT false,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- ============================================================================
-- PART 3: ROLE RESOLUTION FUNCTIONS (RPCs)
-- ============================================================================

-- RPC to resolve role based on Firebase Phone number
CREATE OR REPLACE FUNCTION public.resolve_role_by_phone(_phone TEXT)
RETURNS TABLE(role app_role, is_blocked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Check if phone is registered as an Admin's phone (Admin Bypass)
  -- NOTE: This relies on the 'admins' table having the phone number set.
  RETURN QUERY
  SELECT
    'admin'::app_role,
    ur.is_blocked
  FROM public.admins a
  JOIN public.user_roles ur ON ur.user_id = a.user_id
  WHERE a.phone = _phone;

  IF FOUND THEN RETURN; END IF;

  -- 2. Check if phone is registered as a Rider
  RETURN QUERY
  SELECT
    'rider'::app_role,
    ur.is_blocked
  FROM public.riders r
  JOIN public.user_roles ur ON ur.user_id = r.user_id
  WHERE r.phone = _phone;

  IF FOUND THEN RETURN; END IF;

  -- 3. Check if phone is registered as a Customer (via customer_profiles)
  RETURN QUERY
  SELECT
    'customer'::app_role,
    ur.is_blocked
  FROM public.customer_profiles cp
  JOIN public.user_roles ur ON ur.user_id = cp.user_id
  WHERE cp.phone = _phone;

  IF FOUND THEN RETURN; END IF;

  -- 4. Implicitly map any other user signing in via phone to 'customer' role by default (Fallback)
  RETURN QUERY
  SELECT
    'customer'::app_role,
    false::BOOLEAN
  FROM auth.users u
  WHERE u.raw_app_meta_data->>'phone' = _phone;

END;
$$;

-- RPC to resolve role based on Firebase Email (for email/google sign-in)
-- Assumes email from Firebase Auth is populated in auth.users.email
CREATE OR REPLACE FUNCTION public.resolve_role_by_email(_email TEXT)
RETURNS TABLE(role app_role, is_blocked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Check if email is associated with an Admin
  RETURN QUERY
  SELECT
    'admin'::app_role,
    ur.is_blocked
  FROM public.admins a
  JOIN public.user_roles ur ON ur.user_id = a.user_id
  JOIN auth.users u ON u.id = ur.user_id
  WHERE u.email = _email;

  IF FOUND THEN RETURN; END IF;

  -- 2. Check if email is associated with a Rider
  RETURN QUERY
  SELECT
    'rider'::app_role,
    ur.is_blocked
  FROM public.riders r
  JOIN public.user_roles ur ON ur.user_id = r.user_id
  JOIN auth.users u ON u.id = ur.user_id
  WHERE r.email = _email;

  IF FOUND THEN RETURN; END IF;

  -- 3. Check if email is associated with a Customer
  RETURN QUERY
  SELECT
    'customer'::app_role,
    ur.is_blocked
  FROM public.customer_profiles cp
  JOIN public.user_roles ur ON ur.user_id = cp.user_id
  JOIN auth.users u ON u.id = cp.user_id
  WHERE cp.email = _email;

  IF FOUND THEN RETURN; END IF;

  -- 4. Implicitly map any other user signing in via email/google to 'customer' role by default
  RETURN QUERY
  SELECT
    'customer'::app_role,
    false::BOOLEAN
  FROM auth.users u
  WHERE u.email = _email;
END;
$$;


-- ============================================================================
-- PART 4: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_requests ENABLE ROW LEVEL SECURITY;

-- RLS for user_roles table (Only viewable by the user themselves (via auth.uid()) or Admins)
CREATE POLICY "Users can view their own role." ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

CREATE POLICY "Admins can manage all roles." ON public.user_roles FOR ALL
  USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- RLS for admins table (Only Admins can R/W/D)
CREATE POLICY "Admins can manage admins." ON public.admins FOR ALL
  USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "Enforce admin-only access to other admin data" ON public.admins
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  );

-- RLS for riders table (Riders can only see/update their own data, Admins can see all)
CREATE POLICY "Riders can view/update their own profile." ON public.riders FOR ALL
  USING (
    auth.uid() = user_id
    OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  );
CREATE POLICY "Customer/Rider can only see public data for tracking" ON public.riders FOR SELECT
  USING (
    -- Allowed for customer viewing public info/location if they have an active order/request
    EXISTS (
      SELECT 1 FROM public.orders o WHERE o.rider_id = id AND o.customer_id = auth.uid() AND o.status IN ('preparing', 'on_way', 'delivered')
    )
    OR EXISTS (
      SELECT 1 FROM public.rider_requests r WHERE r.rider_id = id AND r.customer_id = auth.uid() AND r.status IN ('preparing', 'on_way', 'delivered')
    )
    OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin' -- Admin bypass
  );

-- RLS for customer_profiles table (Customers can view/update their own, Admins can see all)
CREATE POLICY "Customers can view/update their own profile." ON public.customer_profiles FOR ALL
  USING (
    auth.uid() = user_id
    OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  );
CREATE POLICY "Admins can view all customer profiles." ON public.customer_profiles FOR SELECT
  USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');

-- RLS for Orders (Crucial for data segregation)
CREATE POLICY "Customers can view their own orders." ON public.orders FOR SELECT
  USING (
    customer_id = auth.uid()
    OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  );
CREATE POLICY "Riders can view assigned orders." ON public.orders FOR SELECT
  USING (
    rider_id = (SELECT id FROM public.riders WHERE user_id = auth.uid())
    OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  );
CREATE POLICY "Owner/Admin can write to orders" ON public.orders FOR INSERT, UPDATE
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin') OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'business'
  );

-- RLS for Rider Requests (Crucial for data segregation)
CREATE POLICY "Customers can view their own rider requests." ON public.rider_requests FOR SELECT
  USING (
    customer_id = auth.uid()
    OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  );
CREATE POLICY "Riders can view assigned rider requests." ON public.rider_requests FOR SELECT
  USING (
    rider_id = (SELECT id FROM public.riders WHERE user_id = auth.uid())
    OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  );
CREATE POLICY "Owner/Admin can write to rider requests" ON public.rider_requests FOR INSERT, UPDATE
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  );

-- RLS for Payments/Withdrawals - OMITTED.

-- ============================================================================
-- PART 5: TRIGGERS & AUTOMATION
-- ============================================================================

-- Trigger to automatically link new user on auth creation (Firebase UID moves to auth.users.id)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create user_roles entry, defaulting to customer. This MUST run before user_id linking.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id) DO NOTHING;

  -- Create placeholder customer profile for new users that sign up via phone/email
  INSERT INTO public.customer_profiles (user_id, phone)
  VALUES (NEW.id, NEW.raw_app_meta_data->>'phone')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================================
-- PART 6: DATABASE VIEWS (For Public Access - e.g., Customer Map)
-- ============================================================================

-- View for online riders (used by customer map) - bypasses RLS
CREATE OR REPLACE VIEW public.public_rider_info AS
SELECT
  id, name, rating, vehicle_type, total_trips, is_online, image, current_location_lat, current_location_lng
FROM public.riders;

-- ============================================================================
-- PART 7: END OF SCRIPT
-- ============================================================================
-- DATABASE SETUP COMPLETE. 
-- Manual Step Required: Add Admin user (+92311011419) to public.admins AND link user_id in public.user_roles.