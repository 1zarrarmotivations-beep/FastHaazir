-- Robust Rider Linking Fix
-- Ensure users created via Email/Sync (phone auth) are linked to Riders even if phone is missing in Auth table

CREATE OR REPLACE FUNCTION public.handle_new_user_rider_link()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _rider_id uuid;
    _normalized_phone text;
    _phone_from_email text;
    _derived_phone text;
BEGIN
    -- 1. Try to find Rider by Email (Standard)
    IF NEW.email IS NOT NULL THEN
        SELECT id INTO _rider_id FROM public.riders
        WHERE email = NEW.email AND user_id IS NULL LIMIT 1;
    END IF;

    -- 2. Try to find Rider by Phone (Standard)
    IF _rider_id IS NULL AND NEW.phone IS NOT NULL THEN
        _normalized_phone := regexp_replace(NEW.phone, '^\+?92', '0');

        SELECT id INTO _rider_id FROM public.riders
        WHERE (phone = NEW.phone OR phone = _normalized_phone)
        AND user_id IS NULL LIMIT 1;
    END IF;

    -- 3. [NEW] Try to find Rider by Phone extracted from Email (Sync Fallback)
    -- Format: user_923365476415@fasthaazir.app
    IF _rider_id IS NULL AND NEW.email LIKE 'user_%@fasthaazir.app' THEN
        -- Extract phone part: user_9233... -> 9233...
        _phone_from_email := substring(NEW.email from 'user_([0-9]+)@');
        
        IF _phone_from_email IS NOT NULL THEN
            -- Try to match this phone in Riders
            -- Riders usually stored as 03... or 92...
            -- Derived phone is likely 92...
            
            SELECT id INTO _rider_id FROM public.riders
            WHERE (phone = _phone_from_email 
                OR phone = '+' || _phone_from_email
                OR phone = REPLACE(_phone_from_email, '92', '0')
            )
            AND user_id IS NULL LIMIT 1;
        END IF;
    END IF;

    -- If match found, link and set role
    IF _rider_id IS NOT NULL THEN
        -- Link Rider
        UPDATE public.riders 
        SET user_id = NEW.id,
            -- If email is dummy, keep rider email if exists? Or update to dummy?
            -- Better to keep existing rider email if it's set, otherwise update.
            email = COALESCE(email, NEW.email) 
        WHERE id = _rider_id;

        -- Ensure Profile Exists & Set Role
        -- We use upsert to be safe against race conditions with handle_new_user
        INSERT INTO public.profiles (user_id, role, status, email, phone)
        VALUES (
            NEW.id, 
            'rider', 
            'active', 
            NEW.email, 
            COALESCE(NEW.phone, _phone_from_email) -- Use derived phone if available
        )
        ON CONFLICT (user_id) DO UPDATE 
        SET role = 'rider',
            status = 'active', 
            -- Update phone if it was null
            phone = COALESCE(profiles.phone, EXCLUDED.phone);
            
        -- Sync User Roles Table
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'rider')
        ON CONFLICT (user_id) DO UPDATE SET role = 'rider';
    END IF;

    RETURN NEW;
END;
$$;
