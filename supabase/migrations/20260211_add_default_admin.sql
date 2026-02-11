-- Migration to ensure the permanent super admin exists
-- Date: 2026-02-11
-- Purpose: Hard-lock +923110111419 as a permanent super_admin

-- 1. Ensure admin_role type exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
        CREATE TYPE public.admin_role AS ENUM ('super_admin', 'order_manager', 'store_manager', 'support_admin');
    END IF;
END $$;

-- 2. Ensure role column exists on admins table
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS role admin_role DEFAULT 'order_manager';

-- 3. Insert or update the super admin
INSERT INTO public.admins (phone, role, is_active)
VALUES ('+923110111419', 'super_admin', true)
ON CONFLICT (phone) DO UPDATE SET 
    role = 'super_admin', 
    is_active = true,
    updated_at = now();

-- Ensure the role is assigned in user_roles if already linked
DO $$
DECLARE
    _user_id uuid;
BEGIN
    SELECT user_id INTO _user_id FROM public.admins WHERE phone = '+923110111419';
    
    IF _user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (_user_id, 'admin'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;
