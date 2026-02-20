-- Improved claim_rider_profile with regex phone matching
-- Also creates triggers to auto-link on user signup or rider creation

-- 1. Improved Function
CREATE OR REPLACE FUNCTION public.claim_rider_profile()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _user_id uuid;
    _email text;
    _phone text;
    _rider_id uuid;
    _is_active boolean;
    _verification_status text;
    _rider_phone_variants text[];
BEGIN
    _user_id := auth.uid();
    
    -- Get email and phone from auth.users
    SELECT email, phone INTO _email, _phone
    FROM auth.users
    WHERE id = _user_id;

    -- Generate phone variants to check against riders table
    -- 1. Exact match
    -- 2. Without leading +
    -- 3. Replace +92 or 92 with 0 (Standard PK format)
    _rider_phone_variants := ARRAY[
        _phone, 
        replace(_phone, '+', ''),
        regexp_replace(_phone, '^\+?92', '0') 
    ];

    -- Attempt 1: Find by Email (if present)
    IF _email IS NOT NULL THEN
        SELECT id, is_active, verification_status INTO _rider_id, _is_active, _verification_status
        FROM public.riders
        WHERE email = _email
        AND (user_id IS NULL OR user_id = _user_id)
        LIMIT 1;
    END IF;

    -- Attempt 2: Find by Phone (if not found by email & phone exists)
    IF _rider_id IS NULL AND _phone IS NOT NULL THEN
        SELECT id, is_active, verification_status INTO _rider_id, _is_active, _verification_status
        FROM public.riders
        WHERE phone = ANY(_rider_phone_variants)
        AND (user_id IS NULL OR user_id = _user_id)
        LIMIT 1;
    END IF;

    -- If found, LINK IT!
    IF _rider_id IS NOT NULL THEN
        -- 1. Link Rider Table
        UPDATE public.riders
        SET user_id = _user_id,
            email = COALESCE(email, _email)
            -- Don't overwrite phone if it's already there, keep the one admin entered
        WHERE id = _rider_id;

        -- 2. Update Profile Role
        UPDATE public.profiles
        SET role = 'rider'
        WHERE user_id = _user_id;

        -- 3. Sync User Roles
        INSERT INTO public.user_roles (user_id, role)
        VALUES (_user_id, 'rider')
        ON CONFLICT (user_id) DO UPDATE SET role = 'rider';

        RETURN jsonb_build_object(
            'success', true,
            'rider_id', _rider_id,
            'role', 'rider',
            'status', _verification_status || '',
            'is_active', _is_active
        );
    END IF;

    RETURN jsonb_build_object(
        'success', false,
        'message', 'No matching unlinked rider profile found.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_rider_profile() TO authenticated;


-- 2. Trigger Function for Auto-Linking on Signup
-- This runs whenever a new user is created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user_rider_link()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _rider_id uuid;
    _normalized_phone text;
BEGIN
    -- Check if email matches an unlinked rider
    IF NEW.email IS NOT NULL THEN
        SELECT id INTO _rider_id FROM public.riders 
        WHERE email = NEW.email AND user_id IS NULL LIMIT 1;
    END IF;

    -- Check if phone matches an unlinked rider
    IF _rider_id IS NULL AND NEW.phone IS NOT NULL THEN
        _normalized_phone := regexp_replace(NEW.phone, '^\+?92', '0');
        
        SELECT id INTO _rider_id FROM public.riders 
        WHERE (phone = NEW.phone OR phone = _normalized_phone) 
        AND user_id IS NULL LIMIT 1;
    END IF;

    -- If match found, link and set role
    IF _rider_id IS NOT NULL THEN
        UPDATE public.riders SET user_id = NEW.id WHERE id = _rider_id;
        
        -- We can't update profiles yet because the profile might not be created 
        -- (race condition with handle_new_user trigger).
        -- Instead, let's insert into user_roles directly which is safe.
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (NEW.id, 'rider')
        ON CONFLICT (user_id) DO UPDATE SET role = 'rider';
        
        -- Also try update profiles if it exists (might not yet)
        UPDATE public.profiles SET role = 'rider' WHERE user_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop and recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_link_rider ON auth.users;
CREATE TRIGGER on_auth_user_created_link_rider
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_rider_link();


-- 3. Trigger Function for Auto-Linking on Admin Rider Creation
-- This runs whenever a new rider is inserted into public.riders
CREATE OR REPLACE FUNCTION public.handle_new_rider_link()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _existing_user_id uuid;
    _user_phone_variant text;
BEGIN
    -- Only proceed if user_id is NULL (unlinked)
    IF NEW.user_id IS NULL THEN
        -- Normalize phone for lookup (03... -> 923...)
        -- We need to check if an auth user exists with this phone/email
        
        -- Check by Email
        IF NEW.email IS NOT NULL THEN
            SELECT id INTO _existing_user_id FROM auth.users WHERE email = NEW.email LIMIT 1;
        END IF;

        -- Check by Phone
        IF _existing_user_id IS NULL AND NEW.phone IS NOT NULL THEN
            -- Convert 03... to 923... for auth table lookup
            _user_phone_variant := regexp_replace(NEW.phone, '^0', '92');
            
            SELECT id INTO _existing_user_id FROM auth.users 
            WHERE phone = NEW.phone OR phone = _user_phone_variant 
            LIMIT 1;
        END IF;

        -- If matching user found, LINK THEM
        IF _existing_user_id IS NOT NULL THEN
            -- Update THIS rider record (NEW is read-only in AFTER trigger, wait, we should use BEFORE trigger?)
            -- Or just update table directly
            UPDATE public.riders SET user_id = _existing_user_id WHERE id = NEW.id;
            
            -- Set their role
            UPDATE public.profiles SET role = 'rider' WHERE user_id = _existing_user_id;
            INSERT INTO public.user_roles (user_id, role) 
            VALUES (_existing_user_id, 'rider')
            ON CONFLICT (user_id) DO UPDATE SET role = 'rider';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop and recreate trigger on public.riders
DROP TRIGGER IF EXISTS on_rider_created_link_user ON public.riders;
CREATE TRIGGER on_rider_created_link_user
    AFTER INSERT ON public.riders
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_rider_link();
