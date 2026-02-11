-- ============================================================================
-- FAST HAAZIR - MISSING TABLES & FUNCTIONS
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. APP ROLE ENUM (if not exists)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'business', 'rider', 'customer');
  ELSE
    -- Add missing values to existing enum
    BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rider'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'business'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- ============================================================================
-- 2. USER ROLES TABLE (Critical for login)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Users can view their own roles') THEN
    CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- 3. RIDER REQUESTS TABLE (Assign a Rider feature)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rider_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_phone TEXT,
  rider_id UUID,
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10,7),
  pickup_lng DECIMAL(10,7),
  dropoff_address TEXT NOT NULL,
  dropoff_lat DECIMAL(10,7),
  dropoff_lng DECIMAL(10,7),
  item_description TEXT,
  item_image TEXT,
  status TEXT NOT NULL DEFAULT 'placed',
  total INTEGER NOT NULL DEFAULT 0,
  otp_code TEXT,
  otp_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rider_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own rider requests" 
ON public.rider_requests FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can create rider requests" 
ON public.rider_requests FOR INSERT 
WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);

CREATE POLICY "Users can update their own rider requests" 
ON public.rider_requests FOR UPDATE USING (auth.uid() = customer_id);

-- ============================================================================
-- 4. WITHDRAWAL REQUESTS TABLE (Rider wallet)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL,
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

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. CATEGORY PRICING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.category_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  base_fee INTEGER NOT NULL DEFAULT 80,
  per_km_rate INTEGER NOT NULL DEFAULT 30,
  min_payment INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.category_pricing ENABLE ROW LEVEL SECURITY;

-- Insert default pricing
INSERT INTO public.category_pricing (category, base_fee, per_km_rate, min_payment) VALUES
  ('food', 80, 30, 100),
  ('grocery', 100, 25, 120),
  ('bakery', 80, 28, 100),
  ('medical', 120, 35, 150),
  ('parcel', 100, 30, 120),
  ('self_delivery', 60, 25, 80)
ON CONFLICT (category) DO NOTHING;

-- Policy
CREATE POLICY "Anyone can view active category pricing"
ON public.category_pricing FOR SELECT USING (is_active = true);

-- ============================================================================
-- 6. PROMO BANNERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.promo_banners (
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

ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promo banners"
ON public.promo_banners FOR SELECT USING (is_active = true);

-- ============================================================================
-- 7. CRITICAL FUNCTIONS
-- ============================================================================

-- 7.1 Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 7.2 Check role function (CRITICAL)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
  OR EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = _user_id AND is_active = true
    AND _role = 'admin'::app_role
  )
$$;

-- 7.3 Phone normalization (Pakistan)
CREATE OR REPLACE FUNCTION public.normalize_pk_phone_digits(_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d TEXT;
BEGIN
  d := regexp_replace(COALESCE(_phone, ''), '[^0-9]', '', 'g');
  IF d = '' THEN RETURN NULL; END IF;
  IF d LIKE '0092%' THEN d := '92' || substr(d, 5); END IF;
  IF d LIKE '92%' THEN RETURN d; END IF;
  IF d LIKE '0%' THEN RETURN '92' || substr(d, 2); END IF;
  IF length(d) = 10 THEN RETURN '92' || d; END IF;
  RETURN d;
END;
$$;

-- 7.4 Role resolver by email (for admin login)
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
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'customer'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  role := 'customer';
  is_blocked := false;
  RETURN NEXT;
END;
$$;

-- 7.5 Role resolver by phone
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
    WHERE a.phone = phone_norm
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

  -- 3) Check riders (linked)
  SELECT r.id, r.is_active INTO _id, _is_active
  FROM public.rider_info r WHERE r.user_id = _uid LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'rider'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    role := 'rider';
    is_blocked := COALESCE(_is_active, true) = false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- 4) Check riders (claim by phone)
  IF phone_norm IS NOT NULL THEN
    SELECT r.id, r.is_active INTO _id, _is_active
    FROM public.rider_info r
    WHERE r.user_id IS NULL AND r.phone = phone_norm
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.rider_info
      SET user_id = _uid, updated_at = now()
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
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'customer'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  role := 'customer';
  is_blocked := false;
  RETURN NEXT;
END;
$$;

-- ============================================================================
-- 8. ADMIN POLICIES (for existing admins table)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admins' AND policyname = 'Admins can view admins') THEN
    CREATE POLICY "Admins can view admins" ON public.admins FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admins' AND policyname = 'Admins can manage admins') THEN
    CREATE POLICY "Admins can manage admins" ON public.admins FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- ============================================================================
-- 9. ADMIN POLICIES FOR OTHER TABLES
-- ============================================================================

-- Orders admin policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admins can view all orders') THEN
    CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admins can update all orders') THEN
    CREATE POLICY "Admins can update all orders" ON public.orders FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Rider info admin policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rider_info' AND policyname = 'Admins can manage all riders') THEN
    CREATE POLICY "Admins can manage all riders" ON public.rider_info FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Businesses admin policies  
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'businesses' AND policyname = 'Admins can manage all businesses') THEN
    CREATE POLICY "Admins can manage all businesses" ON public.businesses FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Menu items admin policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_items' AND policyname = 'Admins can manage all menu items') THEN
    CREATE POLICY "Admins can manage all menu items" ON public.menu_items FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Support tickets admin policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Admins can view all tickets') THEN
    CREATE POLICY "Admins can view all tickets" ON public.support_tickets FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Admins can update all tickets') THEN
    CREATE POLICY "Admins can update all tickets" ON public.support_tickets FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Support messages admin policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'Admins can view all messages') THEN
    CREATE POLICY "Admins can view all messages" ON public.support_messages FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'Admins can insert messages') THEN
    CREATE POLICY "Admins can insert messages" ON public.support_messages FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Rider earnings admin policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rider_earnings' AND policyname = 'Admins can manage all earnings') THEN
    CREATE POLICY "Admins can manage all earnings" ON public.rider_earnings FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Withdrawal requests policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawal_requests' AND policyname = 'Admins can manage withdrawals') THEN
    CREATE POLICY "Admins can manage withdrawals" ON public.withdrawal_requests FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Category pricing admin policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'category_pricing' AND policyname = 'Admins can manage pricing') THEN
    CREATE POLICY "Admins can manage pricing" ON public.category_pricing FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Promo banners admin policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'promo_banners' AND policyname = 'Admins can manage banners') THEN
    CREATE POLICY "Admins can manage banners" ON public.promo_banners FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- ============================================================================
-- 10. REALTIME PUBLICATION
-- ============================================================================

ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
ALTER TABLE public.rider_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_requests; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ============================================================================
-- 11. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_rider_requests_customer_id ON public.rider_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_rider_requests_status ON public.rider_requests(status);

-- ============================================================================
-- 12. ADD YOUR ADMIN
-- ============================================================================

INSERT INTO public.admins (email, phone, name, is_active)
VALUES ('zohaibhassen0@gmail.com', '923110111419', 'Zohaib', true)
ON CONFLICT (email) DO UPDATE SET 
  phone = '923110111419',
  is_active = true;

-- ============================================================================
-- DONE! Your database is now complete.
-- ============================================================================
