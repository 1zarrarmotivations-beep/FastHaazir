-- COMPREHENSIVE FIX FOR RIDER ROLE ISSUES
-- 1. Updates get_unified_role to "Self-Heal" (if linked in riders but profile says customer)
-- 2. Updates handle_new_user to use aggressive 10-digit phone matching (ignores formats)
-- 3. Updates claim_rider_profile to use same aggressive 10-digit matching

-- ==========================================
-- 1. UPDATE get_unified_role (Self-Healing)
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_unified_role(target_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    _role text;
    _profile_enum app_role;
    _profile_status text;
    _is_blocked boolean;
    _rider_status text;
    _rider_active boolean;
    _final_status text;
    _found_in_riders boolean;
BEGIN
    SELECT role, status, is_blocked INTO _profile_enum, _profile_status, _is_blocked
    FROM public.profiles
    WHERE user_id = target_user_id;

    -- Default to customer structure if no profile
    IF _profile_enum IS NULL THEN
        -- Last ditch: Check if they are a rider without a profile?
        SELECT true, verification_status, is_active INTO _found_in_riders, _rider_status, _rider_active
        FROM public.riders WHERE user_id = target_user_id;
        
        IF _found_in_riders THEN
             -- Create acceptable profile on the fly? Or just return rider role
             RETURN jsonb_build_object(
                'role', 'rider',
                'status', CASE WHEN _rider_status = 'verified' THEN 'approved' ELSE 'pending' END,
                'is_blocked', false
             );
        END IF;

        RETURN jsonb_build_object('role', 'customer', 'status', 'active', 'is_blocked', false);
    END IF;

    _role := _profile_enum::text;

    -- SELF-HEAL CHECK: If profile says 'customer', but they are linked in 'riders', they are a RIDER.
    IF _role = 'customer' THEN
        SELECT true, verification_status, is_active INTO _found_in_riders, _rider_status, _rider_active
        FROM public.riders WHERE user_id = target_user_id;

        IF _found_in_riders THEN
            -- Correction!
            _role := 'rider';
            
            -- Optional: Update profile asynchronously? logic here is read-only usually,
            -- but for consistency we could trigger an update.
            -- Using a straight RETURN here is safer/faster. Trigger validation logic elsewhere.
        END IF;
    END IF;

    IF _role = 'rider' THEN
        -- Refresh rider status from riders table
        SELECT verification_status, is_active INTO _rider_status, _rider_active
        FROM public.riders
        WHERE user_id = target_user_id;

        IF _rider_status = 'verified' THEN
            _final_status := 'approved';
        ELSIF _rider_status = 'rejected' THEN
            _final_status := 'rejected';
        ELSE
            _final_status := 'pending';
        END IF;

        IF _is_blocked OR (_rider_active IS NOT NULL AND _rider_active = false) THEN
            _final_status := 'blocked';
            _is_blocked := true;
        END IF;
        
        RETURN jsonb_build_object(
            'role', 'rider',
            'status', _final_status,
            'is_blocked', COALESCE(_is_blocked, false)
        );
    END IF;

    RETURN jsonb_build_object(
        'role', 'customer',
        'status', 'active',
        'is_blocked', COALESCE(_is_blocked, false)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('role', 'customer', 'status', 'error', 'is_blocked', false);
END;
$function$;


-- ==========================================
-- 2. UPDATE handle_new_user (Smart Matching)
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    match_id uuid;
    _role public.app_role := 'customer'; 
    _status public.profile_status := 'active';
    _phone_clean text;
    _is_rider_found boolean := false;
    _rider_id uuid;
    _email_phone_part text;
    _right_10_digits text;
BEGIN
    _phone_clean := NEW.phone;
    
    -- Sync Email Extraction
    IF _phone_clean IS NULL AND NEW.email LIKE 'user_%@fasthaazir.app' THEN
        _email_phone_part := substring(NEW.email from 'user_([0-9]+)@');
        IF _email_phone_part IS NOT NULL THEN
            _phone_clean := '+' || _email_phone_part; 
        END IF;
    END IF;

    -- God Mode
    IF _phone_clean IS NOT NULL AND public.is_god_mode_number(_phone_clean) THEN
         INSERT INTO public.profiles (user_id, role, status, email, phone)
         VALUES (NEW.id, 'super_admin', 'active', NEW.email, _phone_clean)
         ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin', status = 'active';
         RETURN NEW;
    END IF;

    -- Smart Rider Check (Last 10 Digits)
    IF _phone_clean IS NOT NULL THEN
        -- Clean input phone to digits
        _right_10_digits := RIGHT(regexp_replace(_phone_clean, '\D', '', 'g'), 10);
        
        IF length(_right_10_digits) >= 10 THEN
            SELECT id INTO _rider_id 
            FROM public.riders 
            WHERE user_id IS NULL 
            AND RIGHT(regexp_replace(phone, '\D', '', 'g'), 10) = _right_10_digits
            LIMIT 1;

            IF _rider_id IS NOT NULL THEN
                _is_rider_found := true;
                _role := 'rider';
            END IF;
        END IF;
    END IF;

    -- Profile Matching (Legacy)
    IF match_id IS NULL AND _phone_clean IS NOT NULL THEN
         _right_10_digits := RIGHT(regexp_replace(_phone_clean, '\D', '', 'g'), 10);
        SELECT id INTO match_id FROM public.profiles 
        WHERE RIGHT(regexp_replace(phone, '\D', '', 'g'), 10) = _right_10_digits
        LIMIT 1;
    END IF;

    IF match_id IS NULL AND NEW.email IS NOT NULL THEN
        SELECT id INTO match_id FROM public.profiles WHERE email = NEW.email LIMIT 1;
    END IF;

    -- Create/Update Profile
    IF match_id IS NOT NULL THEN
        UPDATE public.profiles 
        SET user_id = NEW.id, 
            email = COALESCE(email, NEW.email),
            phone = COALESCE(phone, _phone_clean),
            role = CASE WHEN _is_rider_found THEN 'rider'::app_role ELSE role END,
            updated_at = now()
        WHERE id = match_id;
    ELSE
        INSERT INTO public.profiles (user_id, role, status, email, phone, full_name)
        VALUES (
            NEW.id,
            _role,
            _status,
            NEW.email,
            COALESCE(NEW.phone, _phone_clean),
            NEW.raw_user_meta_data->>'full_name'
        );
    END IF;

    -- Verify Link
    IF _is_rider_found AND _rider_id IS NOT NULL THEN
        UPDATE public.riders 
        SET user_id = NEW.id, is_active = true, email = COALESCE(email, NEW.email)
        WHERE id = _rider_id;

        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'rider')
        ON CONFLICT (user_id) DO UPDATE SET role = 'rider';
        
        -- Double check profile is rider
        UPDATE public.profiles SET role = 'rider' WHERE user_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- ==========================================
-- 3. UPDATE claim_rider_profile (Smart Claim)
-- ==========================================
CREATE OR REPLACE FUNCTION public.claim_rider_profile()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _user_id uuid;
    _email text;
    _phone text;
    _rider_id uuid;
    _is_active boolean;
    _verification_status text;
    _email_phone_part text;
    _right_10_digits text;
BEGIN
    _user_id := auth.uid();
    IF _user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Not authenticated'); END IF;

    SELECT email, phone INTO _email, _phone FROM auth.users WHERE id = _user_id;

    -- 1. By Email
    IF _email IS NOT NULL THEN
        SELECT id, is_active, verification_status INTO _rider_id, _is_active, _verification_status
        FROM public.riders
        WHERE email = _email AND (user_id IS NULL OR user_id = _user_id) LIMIT 1;
    END IF;

    -- 2. By Phone (Smart 10-digit match)
    IF _rider_id IS NULL THEN
        -- Try derived phone from email
        IF _phone IS NULL AND _email LIKE 'user_%@fasthaazir.app' THEN
             _email_phone_part := substring(_email from 'user_([0-9]+)@');
             IF _email_phone_part IS NOT NULL THEN _phone := _email_phone_part; END IF;
        END IF;

        IF _phone IS NOT NULL THEN
            _right_10_digits := RIGHT(regexp_replace(_phone, '\D', '', 'g'), 10);
            
            IF length(_right_10_digits) >= 10 THEN
                SELECT id, is_active, verification_status INTO _rider_id, _is_active, _verification_status
                FROM public.riders
                WHERE RIGHT(regexp_replace(phone, '\D', '', 'g'), 10) = _right_10_digits
                AND (user_id IS NULL OR user_id = _user_id)
                LIMIT 1;
            END IF;
        END IF;
    END IF;

    IF _rider_id IS NOT NULL THEN
        UPDATE public.riders
        SET user_id = _user_id, email = COALESCE(email, _email)
        WHERE id = _rider_id;

        UPDATE public.profiles
        SET role = 'rider', status = 'active', updated_at = now()
        WHERE user_id = _user_id;

        INSERT INTO public.user_roles (user_id, role)
        VALUES (_user_id, 'rider')
        ON CONFLICT (user_id) DO UPDATE SET role = 'rider';

        RETURN jsonb_build_object('success', true, 'rider_id', _rider_id, 'role', 'rider');
    END IF;

    RETURN jsonb_build_object('success', false, 'message', 'No matching unlinked rider profile found.');
END;
$$;
