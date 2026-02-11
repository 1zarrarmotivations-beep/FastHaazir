-- ============================================================================
-- FAST HAAZIR - COMPLETE DATABASE SETUP
-- Generated: February 9, 2026
-- Run this entire SQL in Supabase SQL Editor to set up your database
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
  delivery_lat DECIMAL(10,7),
  delivery_lng DECIMAL(10,7),
  pickup_address TEXT,
  pickup_lat DECIMAL(10,7),
  pickup_lng DECIMAL(10,7),
  notes TEXT,
  eta TEXT,
  otp_code TEXT,
  otp_verified BOOLEAN DEFAULT false,
  rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.5 Rider Requests Table (Assign a Rider)
CREATE TABLE public.rider_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_phone TEXT,
  rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10,7),
  pickup_lng DECIMAL(10,7),
  dropoff_address TEXT NOT NULL,
  dropoff_lat DECIMAL(10,7),
  dropoff_lng DECIMAL(10,7),
  item_description TEXT,
  item_image TEXT,
  status order_status NOT NULL DEFAULT 'placed',
  total INTEGER NOT NULL DEFAULT 0,
  otp_code TEXT,
  otp_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.6 User Roles Table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 2.7 Admins Table
CREATE TABLE public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 Customer Profiles Table
CREATE TABLE public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  email TEXT,
  default_address TEXT,
  default_lat DECIMAL(10,7),
  default_lng DECIMAL(10,7),
  fcm_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.9 Customer Addresses Table
CREATE TABLE public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL DEFAULT 'Home',
  address TEXT NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.10 Notifications Table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rider_request_id UUID REFERENCES public.rider_requests(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.11 Chat Messages Table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_request_id UUID REFERENCES public.rider_requests(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'business', 'rider', 'admin')),
  message TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'voice')),
  voice_url TEXT,
  voice_duration NUMERIC,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.12 Support Tickets Table
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    subject TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.13 Support Messages Table
CREATE TABLE public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_system BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.14 Rider Payments Table
CREATE TABLE public.rider_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rider_request_id UUID REFERENCES public.rider_requests(id) ON DELETE SET NULL,
  distance_km NUMERIC DEFAULT 0,
  pickup_km NUMERIC DEFAULT 0,
  delivery_km NUMERIC DEFAULT 0,
  base_fee INTEGER DEFAULT 50,
  per_km_rate INTEGER DEFAULT 15,
  calculated_amount INTEGER NOT NULL,
  final_amount INTEGER NOT NULL,
  category TEXT DEFAULT 'food',
  rider_lat NUMERIC,
  rider_lng NUMERIC,
  customer_lat NUMERIC,
  customer_lng NUMERIC,
  pickup_lat NUMERIC,
  pickup_lng NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.15 Rider Payment Settings Table
CREATE TABLE public.rider_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_fee INTEGER NOT NULL DEFAULT 50,
  per_km_rate INTEGER NOT NULL DEFAULT 15,
  min_payment INTEGER NOT NULL DEFAULT 50,
  max_delivery_radius_km INTEGER DEFAULT 15,
  min_order_value INTEGER DEFAULT 200,
  rider_base_earning INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default payment settings
INSERT INTO public.rider_payment_settings (base_fee, per_km_rate, min_payment, is_active)
VALUES (50, 15, 50, true) ON CONFLICT DO NOTHING;

-- 2.16 Withdrawal Requests Table
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT DEFAULT 'cash',
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.17 Category Pricing Table
CREATE TABLE public.category_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  base_fee INTEGER NOT NULL DEFAULT 80,
  per_km_rate INTEGER NOT NULL DEFAULT 30,
  min_payment INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default category pricing
INSERT INTO public.category_pricing (category, base_fee, per_km_rate, min_payment) VALUES
  ('food', 80, 30, 100),
  ('grocery', 100, 25, 120),
  ('bakery', 80, 28, 100),
  ('medical', 120, 35, 150),
  ('parcel', 100, 30, 120),
  ('self_delivery', 60, 25, 80)
ON CONFLICT (category) DO NOTHING;

-- 2.18 Promo Banners Table
CREATE TABLE public.promo_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PART 3: ANALYTICS TABLES
-- ============================================================================

-- 3.1 Page Views
CREATE TABLE public.analytics_page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    page_path TEXT NOT NULL,
    page_title TEXT,
    referrer TEXT,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
    browser TEXT,
    os TEXT,
    country TEXT,
    city TEXT,
    ip_address INET,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 Sessions
CREATE TABLE public.analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    session_end TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
    browser TEXT,
    os TEXT,
    country TEXT,
    city TEXT,
    ip_address INET,
    entry_page TEXT,
    exit_page TEXT,
    total_pages_viewed INTEGER DEFAULT 0,
    total_duration_seconds INTEGER DEFAULT 0,
    is_bounce BOOLEAN DEFAULT false,
    traffic_source TEXT CHECK (traffic_source IN ('direct', 'social', 'search', 'referral', 'email', 'other')),
    referrer_url TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.3 Events
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    event_category TEXT NOT NULL CHECK (event_category IN ('page_view', 'click', 'form', 'order', 'auth', 'search', 'error', 'custom')),
    event_label TEXT,
    event_value NUMERIC,
    metadata JSONB DEFAULT '{}'::jsonb,
    page_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.4 Active Users (Realtime)
CREATE TABLE public.analytics_active_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_page TEXT,
    UNIQUE(user_id, session_id)
);

-- ============================================================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_active_users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 5: HELPER FUNCTIONS
-- ============================================================================

-- 5.1 Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 5.2 Check role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
  OR EXISTS (
    SELECT 1
    FROM public.admins
    WHERE user_id = _user_id
      AND is_active = true
      AND _role = 'admin'::app_role
  )
$$;

-- 5.3 Phone normalization function (Pakistan)
CREATE OR REPLACE FUNCTION public.normalize_pk_phone_digits(_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d TEXT;
BEGIN
  d := regexp_replace(COALESCE(_phone, ''), '[^0-9]', '', 'g');

  IF d = '' THEN
    RETURN NULL;
  END IF;

  IF d LIKE '0092%' THEN
    d := '92' || substr(d, 5);
  END IF;

  IF d LIKE '92%' THEN
    RETURN d;
  END IF;

  IF d LIKE '0%' THEN
    RETURN '92' || substr(d, 2);
  END IF;

  IF length(d) = 10 THEN
    RETURN '92' || d;
  END IF;

  RETURN d;
END;
$$;

-- 5.4 Role resolution function
CREATE OR REPLACE FUNCTION public.resolve_role_by_phone(_phone TEXT)
RETURNS TABLE(role TEXT, is_blocked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID := auth.uid();
  phone_norm TEXT;
  _id UUID;
  _is_active BOOLEAN;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  phone_norm := public.normalize_pk_phone_digits(_phone);

  -- 1) Check admins by phone
  IF phone_norm IS NOT NULL THEN
    SELECT a.id, a.is_active INTO _id, _is_active
    FROM public.admins a
    WHERE a.phone = phone_norm OR a.email = _phone
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.admins
      SET user_id = _uid, updated_at = now()
      WHERE id = _id AND (user_id IS NULL OR user_id = _uid);

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'admin'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      role := 'admin';
      is_blocked := COALESCE(_is_active, true) = false;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  -- 2) Check existing admin role
  IF public.has_role(_uid, 'admin'::app_role) THEN
    role := 'admin';
    is_blocked := false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- 3) Check riders (already linked)
  SELECT r.id, r.is_active INTO _id, _is_active
  FROM public.riders r WHERE r.user_id = _uid LIMIT 1;

  IF FOUND THEN
    role := 'rider';
    is_blocked := COALESCE(_is_active, true) = false;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'rider'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEXT;
    RETURN;
  END IF;

  -- 4) Check riders (claim by phone)
  IF phone_norm IS NOT NULL THEN
    SELECT r.id, r.is_active INTO _id, _is_active
    FROM public.riders r
    WHERE r.user_id IS NULL AND r.phone = phone_norm
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.riders
      SET user_id = _uid, claimed = true, phone = phone_norm, updated_at = now()
      WHERE id = _id;

      INSERT INTO public.user_roles (user_id, role)
      VALUES (_uid, 'rider'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      role := 'rider';
      is_blocked := COALESCE(_is_active, true) = false;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  -- 5) Default to customer
  INSERT INTO public.customer_profiles (user_id, name)
  VALUES (_uid, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'customer'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  role := 'customer';
  is_blocked := false;
  RETURN NEXT;
END;
$$;

-- 5.5 Role resolution by email (for admin login)
CREATE OR REPLACE FUNCTION public.resolve_role_by_email(_email TEXT)
RETURNS TABLE(role TEXT, is_blocked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID := auth.uid();
  _id UUID;
  _is_active BOOLEAN;
  _email_lower TEXT;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  _email_lower := lower(trim(COALESCE(_email, '')));

  -- Check admins by email
  SELECT a.id, a.is_active INTO _id, _is_active
  FROM public.admins a
  WHERE lower(a.email) = _email_lower
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.admins
    SET user_id = _uid, updated_at = now()
    WHERE id = _id AND (user_id IS NULL OR user_id = _uid);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    role := 'admin';
    is_blocked := COALESCE(_is_active, true) = false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Check existing admin role
  IF public.has_role(_uid, 'admin'::app_role) THEN
    role := 'admin';
    is_blocked := false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Default to customer
  INSERT INTO public.customer_profiles (user_id, name)
  VALUES (_uid, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'customer'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  role := 'customer';
  is_blocked := false;
  RETURN NEXT;
END;
$$;

-- ============================================================================
-- PART 6: RLS POLICIES
-- ============================================================================

-- 6.1 Businesses policies
CREATE POLICY "Businesses are viewable by everyone" 
ON public.businesses FOR SELECT USING (true);

CREATE POLICY "Admins can manage all businesses"
ON public.businesses FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 6.2 Menu items policies
CREATE POLICY "Menu items are viewable by everyone" 
ON public.menu_items FOR SELECT USING (true);

CREATE POLICY "Admins can manage all menu items"
ON public.menu_items FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 6.3 Riders policies
CREATE POLICY "Active riders are viewable by everyone" 
ON public.riders FOR SELECT USING (is_active = true);

CREATE POLICY "Riders can view their own record"
ON public.riders FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Riders can update their own record"
ON public.riders FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can register as riders"
ON public.riders FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all riders"
ON public.riders FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 6.4 Orders policies
CREATE POLICY "Users can view their own orders" 
ON public.orders FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can create their own orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);

CREATE POLICY "Riders can view assigned orders"
ON public.orders FOR SELECT
USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

CREATE POLICY "Riders can update assigned orders"
ON public.orders FOR UPDATE
USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all orders"
ON public.orders FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- 6.5 Rider requests policies
CREATE POLICY "Users can view their own rider requests" 
ON public.rider_requests FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can create rider requests" 
ON public.rider_requests FOR INSERT 
WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);

CREATE POLICY "Riders can view pending requests"
ON public.rider_requests FOR SELECT
USING ((status = 'placed' AND rider_id IS NULL) 
  OR rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

CREATE POLICY "Riders can update assigned requests"
ON public.rider_requests FOR UPDATE
USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
  OR (status = 'placed' AND rider_id IS NULL));

CREATE POLICY "Admins can view all rider requests"
ON public.rider_requests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all rider requests"
ON public.rider_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- 6.6 User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 6.7 Admins policies
CREATE POLICY "Admins can view admins allowlist"
ON public.admins FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage admins allowlist"
ON public.admins FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6.8 Customer profiles policies
CREATE POLICY "Users can view their own profile"
ON public.customer_profiles FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.customer_profiles FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can create their own profile"
ON public.customer_profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- 6.9 Customer addresses policies
CREATE POLICY "Users can view their own addresses"
ON public.customer_addresses FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own addresses"
ON public.customer_addresses FOR ALL USING (user_id = auth.uid());

-- 6.10 Notifications policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- 6.11 Support tickets policies
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
ON public.support_tickets FOR SELECT
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update tickets"
ON public.support_tickets FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- 6.12 Support messages policies
CREATE POLICY "Users can view messages for their tickets"
ON public.support_messages FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = ticket_id AND user_id = auth.uid()
));

CREATE POLICY "Users can insert messages to their tickets"
ON public.support_messages FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = ticket_id AND user_id = auth.uid()
));

CREATE POLICY "Admins can view all support messages"
ON public.support_messages FOR SELECT
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert support messages"
ON public.support_messages FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- 6.13 Rider payments policies
CREATE POLICY "Riders can view their own payments"
ON public.rider_payments FOR SELECT
USING (rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all payments"
ON public.rider_payments FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 6.14 Payment settings policies
CREATE POLICY "Anyone can view active payment settings"
ON public.rider_payment_settings FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage payment settings"
ON public.rider_payment_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 6.15 Withdrawal requests policies
CREATE POLICY "Riders can view their own withdrawal requests"
ON public.withdrawal_requests FOR SELECT
USING (rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()));

CREATE POLICY "Riders can create withdrawal requests"
ON public.withdrawal_requests FOR INSERT
WITH CHECK (rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all withdrawal requests"
ON public.withdrawal_requests FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 6.16 Category pricing policies
CREATE POLICY "Anyone can view active category pricing"
ON public.category_pricing FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage category pricing"
ON public.category_pricing FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 6.17 Promo banners policies
CREATE POLICY "Anyone can view active promo banners"
ON public.promo_banners FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage promo banners"
ON public.promo_banners FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 6.18 Analytics policies (admin only view, service insert)
CREATE POLICY "Admins can view all analytics"
ON public.analytics_page_views FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert page views"
ON public.analytics_page_views FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all sessions"
ON public.analytics_sessions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert sessions"
ON public.analytics_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update sessions"
ON public.analytics_sessions FOR UPDATE USING (true);

CREATE POLICY "Admins can view all events"
ON public.analytics_events FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert events"
ON public.analytics_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view active users"
ON public.analytics_active_users FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can manage active users"
ON public.analytics_active_users FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 7: TRIGGERS
-- ============================================================================

CREATE TRIGGER update_businesses_updated_at
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_riders_updated_at
BEFORE UPDATE ON public.riders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rider_requests_updated_at
BEFORE UPDATE ON public.rider_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admins_updated_at
BEFORE UPDATE ON public.admins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_profiles_updated_at
BEFORE UPDATE ON public.customer_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rider_payments_updated_at
BEFORE UPDATE ON public.rider_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PART 8: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_riders_phone ON public.riders (phone);
CREATE INDEX IF NOT EXISTS idx_riders_user_id ON public.riders (user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_phone ON public.businesses (owner_phone);
CREATE INDEX IF NOT EXISTS idx_admins_phone ON public.admins (phone);
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins (email);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON public.orders (rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_rider_requests_customer_id ON public.rider_requests (customer_id);
CREATE INDEX IF NOT EXISTS idx_rider_requests_rider_id ON public.rider_requests (rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_requests_status ON public.rider_requests (status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_order_created ON public.chat_messages(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_request_created ON public.chat_messages(rider_request_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- Unique indexes to prevent duplicate payments
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_order_payment 
ON public.rider_payments(order_id) WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_request_payment 
ON public.rider_payments(rider_request_id) WHERE rider_request_id IS NOT NULL;

-- ============================================================================
-- PART 9: REALTIME PUBLICATION
-- ============================================================================

ALTER TABLE public.admins REPLICA IDENTITY FULL;
ALTER TABLE public.riders REPLICA IDENTITY FULL;
ALTER TABLE public.businesses REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.rider_requests REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER TABLE public.withdrawal_requests REPLICA IDENTITY FULL;

-- Add tables to realtime publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admins;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.riders;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.businesses;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_requests;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 10: STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('business-images', 'business-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('menu-images', 'menu-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('profile-images', 'profile-images', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('chat-voice-notes', 'chat-voice-notes', false, 10485760, ARRAY['audio/webm', 'audio/ogg', 'audio/mpeg'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies
CREATE POLICY "Public read access for business-images"
ON storage.objects FOR SELECT USING (bucket_id = 'business-images');

CREATE POLICY "Admins can upload business images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'business-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public read access for menu-images"
ON storage.objects FOR SELECT USING (bucket_id = 'menu-images');

CREATE POLICY "Admins can upload menu images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'menu-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public read access for profile-images"
ON storage.objects FOR SELECT USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload profile images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-images' AND auth.uid() IS NOT NULL);

-- ============================================================================
-- PART 11: INSERT YOUR FIRST ADMIN
-- Replace the email/phone with your admin credentials
-- ============================================================================

-- INSERT INTO public.admins (email, phone, name, is_active)
-- VALUES ('your-admin@email.com', '923001234567', 'Admin Name', true);

-- ============================================================================
-- END OF DATABASE SETUP
-- ============================================================================
