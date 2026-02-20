-- ULTRA ROBOST HANDLE_NEW_USER TRIGGER
-- This incorporates "Smart Detection" to identifying Riders immediately upon signup
-- It handles:
-- 1. Normal Phone Signup
-- 2. Firebase Sync Signup (where phone is hidden in email: user_92300...@fasthaazir.app)
-- 3. Pre-existing Riders added by Admin

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    match_id uuid;
    _role public.app_role := 'customer'; -- Default to customer
    _status public.profile_status := 'active';
    _phone_clean text;
    _is_rider_found boolean := false;
    _rider_id uuid;
    _email_phone_part text;
BEGIN
    -- 1. Determine the "Real" Phone Number
    _phone_clean := NEW.phone;
    
    -- If phone is null, check if this is a Firebase Sync Email (user_923365476415@fasthaazir.app)
    IF _phone_clean IS NULL AND NEW.email LIKE 'user_%@fasthaazir.app' THEN
        -- Extract the phone digits: user_9233... -> 9233...
        _email_phone_part := substring(NEW.email from 'user_([0-9]+)@');
        IF _email_phone_part IS NOT NULL THEN
            _phone_clean := '+' || _email_phone_part; -- Normalize to +92 format for consistency? Or just keep digits?
            -- Let's try to match generous formats
        END IF;
    END IF;

    -- 2. God Mode Override (Safety Check)
    IF _phone_clean IS NOT NULL AND public.is_god_mode_number(_phone_clean) THEN
         INSERT INTO public.profiles (user_id, role, status, email, phone)
         VALUES (NEW.id, 'super_admin', 'active', NEW.email, _phone_clean)
         ON CONFLICT (user_id) DO UPDATE 
         SET role = 'super_admin', status = 'active';
         RETURN NEW;
    END IF;

    -- 3. CHECK IF THIS USER IS A RIDER (The "Double Check")
    -- We check the 'riders' table for a matching unlinked rider
    IF _phone_clean IS NOT NULL THEN
        -- Check exact match, or +92 vs 03 vs 92 variations
        SELECT id INTO _rider_id 
        FROM public.riders 
        WHERE user_id IS NULL -- Only claim unlinked riders
        AND (
            phone = _phone_clean 
            OR phone = replace(_phone_clean, '+', '') 
            OR phone = replace(_phone_clean, '+92', '0')
            OR phone = replace(_phone_clean, '92', '0')
            OR (_email_phone_part IS NOT NULL AND phone = _email_phone_part) -- Check the raw digits from email
        )
        LIMIT 1;

        IF _rider_id IS NOT NULL THEN
            _is_rider_found := true;
            _role := 'rider';
            _status := 'active'; -- Riders are active upon claiming profile
        END IF;
    END IF;

    -- 4. Check for existing Profile (Legacy/Re-link logic)
    IF match_id IS NULL AND _phone_clean IS NOT NULL THEN
        SELECT id INTO match_id FROM public.profiles 
        WHERE (phone = _phone_clean OR phone = replace(_phone_clean, '+92', '0'))
        LIMIT 1;
    END IF;

    IF match_id IS NULL AND NEW.email IS NOT NULL THEN
        SELECT id INTO match_id FROM public.profiles WHERE email = NEW.email LIMIT 1;
    END IF;

    -- 5. Create or Update Profile
    IF match_id IS NOT NULL THEN
        -- Update existing profile
        UPDATE public.profiles 
        SET user_id = NEW.id, 
            email = COALESCE(email, NEW.email),
            phone = COALESCE(phone, _phone_clean),
            role = CASE WHEN _is_rider_found THEN 'rider'::app_role ELSE role END, -- Upgrade to rider if found
            updated_at = now()
        WHERE id = match_id;
    ELSE
        -- Create NEW profile
        INSERT INTO public.profiles (
            user_id, 
            role, 
            status, 
            email, 
            phone, 
            full_name
        )
        VALUES (
            NEW.id,
            _role, -- Will be 'rider' if found, else 'customer'
            _status,
            NEW.email,
            COALESCE(NEW.phone, _phone_clean), -- Store the derived phone if NEW.phone is null
            NEW.raw_user_meta_data->>'full_name'
        );
    END IF;

    -- 6. If Rider was found, LINK IT NOW (Atomic Operation)
    IF _is_rider_found AND _rider_id IS NOT NULL THEN
        UPDATE public.riders 
        SET user_id = NEW.id, 
            is_active = true,
            -- Update email if missing
            email = COALESCE(email, NEW.email)
        WHERE id = _rider_id;

        -- Ensure user_roles is synced
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'rider')
        ON CONFLICT (user_id) DO UPDATE SET role = 'rider';
    END IF;

    RETURN NEW;
END;
$$;
