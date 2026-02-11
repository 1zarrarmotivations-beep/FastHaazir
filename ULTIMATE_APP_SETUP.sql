
-- FAST HAAZIR - MASTER DEBUG & SETUP SCRIPT
-- This script ensures all tables, enums, and functions are correctly matched to the app's code.

-- 1. ENUMS
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_type') THEN
        CREATE TYPE public.business_type AS ENUM ('restaurant', 'bakery', 'grocery', 'shop', 'pharmacy');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM ('placed', 'preparing', 'on_way', 'delivered', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'business', 'rider', 'customer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
        CREATE TYPE public.admin_role AS ENUM ('super_admin', 'order_manager', 'store_manager', 'support_admin');
    END IF;
END $$;

-- 2. CORE TABLES

-- Admins
ALTER TABLE IF EXISTS public.admins ADD COLUMN IF NOT EXISTS role admin_role DEFAULT 'order_manager';
ALTER TABLE IF EXISTS public.admins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE IF EXISTS public.admins ADD COLUMN IF NOT EXISTS name TEXT;

-- Businesses
CREATE TABLE IF NOT EXISTS public.businesses (
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
  is_approved BOOLEAN DEFAULT true,
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

-- Menu Items
CREATE TABLE IF NOT EXISTS public.menu_items (
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

-- Customer Profiles (Match what useCustomerProfile expects)
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  phone_verified BOOLEAN DEFAULT false,
  profile_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- If "customers" table exists, migrate data to "customer_profiles"
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        INSERT INTO public.customer_profiles (user_id, name, phone, created_at)
        SELECT user_id, name, phone, created_at FROM public.customers
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;

-- Customer Addresses
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL DEFAULT 'Home',
  address TEXT NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rider Request (Enhanced for pickup details)
ALTER TABLE IF EXISTS public.rider_requests ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE IF EXISTS public.rider_requests ADD COLUMN IF NOT EXISTS otp_code TEXT;
ALTER TABLE IF EXISTS public.rider_requests ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT false;

-- System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 3. FUNCTIONS

-- has_role - The most important one
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  ) OR EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = _user_id AND is_active = true AND (_role = 'admin'::app_role OR role = 'super_admin')
  );
$$;

-- resolve_role_by_phone
CREATE OR REPLACE FUNCTION public.resolve_role_by_phone(_phone text)
RETURNS TABLE(role text, is_blocked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  phone_norm text;
  _id uuid;
  _is_active boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  
  -- Basic normalization (assumes utility function exists or handles simply)
  phone_norm := regexp_replace(_phone, '[^0-9]', '', 'g');
  IF length(phone_norm) = 11 AND phone_norm LIKE '0%' THEN phone_norm := '92' || substr(phone_norm, 2); END IF;
  IF length(phone_norm) = 10 THEN phone_norm := '92' || phone_norm; END IF;

  -- 1) Admin
  SELECT a.id, a.is_active INTO _id, _is_active FROM public.admins a WHERE a.phone LIKE '%' || phone_norm OR a.phone = _phone LIMIT 1;
  IF FOUND THEN
    UPDATE public.admins SET user_id = _uid, updated_at = now() WHERE id = _id AND (user_id IS NULL OR user_id = _uid);
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
    RETURN QUERY SELECT 'admin'::text, NOT _is_active; RETURN;
  END IF;

  -- 2) Rider
  SELECT r.id, r.is_active INTO _id, _is_active FROM public.riders r WHERE r.phone LIKE '%' || phone_norm OR r.user_id = _uid LIMIT 1;
  IF FOUND THEN
    UPDATE public.riders SET user_id = _uid, updated_at = now() WHERE id = _id AND (user_id IS NULL OR user_id = _uid);
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'rider'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
    RETURN QUERY SELECT 'rider'::text, NOT _is_active; RETURN;
  END IF;

  -- 3) Customer Profile (Ensure exists)
  INSERT INTO public.customer_profiles (user_id, phone) VALUES (_uid, _phone) ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'customer'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
  RETURN QUERY SELECT 'customer'::text, false;
END;
$$;

-- resolve_role_by_email
CREATE OR REPLACE FUNCTION public.resolve_role_by_email(_email text)
RETURNS TABLE(role text, is_blocked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _is_active boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT a.id, a.is_active INTO _id, _is_active FROM public.admins a WHERE lower(a.email) = lower(_email) LIMIT 1;
  IF FOUND THEN
    UPDATE public.admins SET user_id = _uid, updated_at = now() WHERE id = _id AND (user_id IS NULL OR user_id = _uid);
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
    RETURN QUERY SELECT 'admin'::text, NOT _is_active; RETURN;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'customer'::app_role) ON CONFLICT (user_id, role) DO NOTHING;
  RETURN QUERY SELECT 'customer'::text, false;
END;
$$;

-- 4. REALTIME
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.businesses;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
