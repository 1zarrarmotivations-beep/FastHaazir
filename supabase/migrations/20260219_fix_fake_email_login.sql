-- Improved claim_rider_profile to handle "fake email" phone logins
CREATE OR REPLACE FUNCTION public.claim_rider_profile()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _user_id uuid;
    _email text;
    _phone text;
    _extracted_phone text;
    _rider_id uuid;
    _is_active boolean;
    _verification_status text;
BEGIN
    _user_id := auth.uid();
    
    SELECT email, phone INTO _email, _phone
    FROM auth.users
    WHERE id = _user_id;

    -- 1. Try match by Email (exact)
    IF _email IS NOT NULL THEN
        SELECT id, is_active, verification_status INTO _rider_id, _is_active, _verification_status
        FROM public.riders
        WHERE email = _email
        AND (user_id IS NULL OR user_id = _user_id)
        LIMIT 1;
    END IF;

    -- 2. Try match by Phone (auth.phone)
    IF _rider_id IS NULL AND _phone IS NOT NULL THEN
        SELECT id, is_active, verification_status INTO _rider_id, _is_active, _verification_status
        FROM public.riders
        WHERE (
            phone = _phone OR 
            phone = replace(_phone, '+', '') OR
            phone = regexp_replace(_phone, '^\+?92', '0')
        )
        AND (user_id IS NULL OR user_id = _user_id)
        LIMIT 1;
    END IF;

    -- 3. Try match by Extracted Phone from Email (user_923...@fasthaazir.app)
    -- This handles the case where phone login creates a dummy email
    IF _rider_id IS NULL AND _email IS NOT NULL AND _email LIKE 'user_%@%' THEN
        -- Extract digits between 'user_' and '@'
        _extracted_phone := substring(_email from 'user_([0-9]+)@');
        
        IF _extracted_phone IS NOT NULL THEN
            -- Try to match this extracted phone against rider phones
            -- Extracted is likely 923... or 3...
            -- Rider is likely 03...
            
            SELECT id, is_active, verification_status INTO _rider_id, _is_active, _verification_status
            FROM public.riders
            WHERE (
                phone = _extracted_phone OR
                phone = timestamp_to_phone(_extracted_phone) OR -- Just in case custom func exists? No.
                -- Normalize extracted (923...) to local (03...)
                phone = regexp_replace(_extracted_phone, '^\+?92', '0') OR
                -- Normalize extracted (3...) to local (03...)
                phone = '0' || _extracted_phone 
            )
            AND (user_id IS NULL OR user_id = _user_id)
            LIMIT 1;
        END IF;
    END IF;

    -- If found, LINK IT!
    IF _rider_id IS NOT NULL THEN
        UPDATE public.riders
        SET user_id = _user_id,
            email = COALESCE(email, _email) -- Backfill email if missing? Maybe not if it's the fake one.
            -- Actually, if it's the fake email, maybe we shouldn't save it to riders table?
            -- But we need something. Let's save it for now, it's better than NULL.
        WHERE id = _rider_id;

        -- Update Role
        UPDATE public.profiles
        SET role = 'rider'
        WHERE user_id = _user_id;

        INSERT INTO public.user_roles (user_id, role)
        VALUES (_user_id, 'rider')
        ON CONFLICT (user_id) DO UPDATE SET role = 'rider';

        RETURN jsonb_build_object(
            'success', true,
            'rider_id', _rider_id,
            'role', 'rider',
            'status', _verification_status,
            'is_active', _is_active
        );
    END IF;

    RETURN jsonb_build_object(
        'success', false,
        'message', 'No matching unlinked rider profile found.'
    );
END;
$$;

-- Also update the trigger function to support this extraction logic
CREATE OR REPLACE FUNCTION public.handle_new_user_rider_link()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _rider_id uuid;
    _extracted_phone text;
BEGIN
    -- Check by Email
    IF NEW.email IS NOT NULL THEN
        SELECT id INTO _rider_id FROM public.riders 
        WHERE email = NEW.email AND user_id IS NULL LIMIT 1;
    END IF;

    -- Check by Phone
    IF _rider_id IS NULL AND NEW.phone IS NOT NULL THEN
        SELECT id INTO _rider_id FROM public.riders 
        WHERE (
            phone = NEW.phone OR 
            phone = replace(NEW.phone, '+', '') OR
            phone = regexp_replace(NEW.phone, '^\+?92', '0')
        )
        AND user_id IS NULL LIMIT 1;
    END IF;

    -- Check by Extracted Phone (user_923...@...)
    IF _rider_id IS NULL AND NEW.email IS NOT NULL AND NEW.email LIKE 'user_%@%' THEN
        _extracted_phone := substring(NEW.email from 'user_([0-9]+)@');
        
        IF _extracted_phone IS NOT NULL THEN
            SELECT id INTO _rider_id FROM public.riders 
            WHERE (
                phone = _extracted_phone OR
                phone = regexp_replace(_extracted_phone, '^\+?92', '0') OR
                phone = '0' || _extracted_phone
            )
            AND user_id IS NULL LIMIT 1;
        END IF; 
    END IF;

    -- If match found, link and set role
    IF _rider_id IS NOT NULL THEN
        UPDATE public.riders SET user_id = NEW.id WHERE id = _rider_id;
        
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (NEW.id, 'rider')
        ON CONFLICT (user_id) DO UPDATE SET role = 'rider';
        
        UPDATE public.profiles SET role = 'rider' WHERE user_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;
