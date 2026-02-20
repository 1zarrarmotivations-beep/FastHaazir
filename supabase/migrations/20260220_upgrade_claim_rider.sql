-- UPGRADE CLAIM_RIDER_PROFILE FUNCTION
-- Purpose: Allow users to "self-correct" their role to Rider if they were missed by triggers
-- Added: "Phone extraction from Sync Email" logic

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
    _email_phone_part text;
BEGIN
    _user_id := auth.uid();
    IF _user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;

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
        replace(COALESCE(_phone,''), '+', ''),
        regexp_replace(COALESCE(_phone,''), '^\+?92', '0')
    ];

    -- Attempt 1: Find by Email (Standard)
    IF _email IS NOT NULL THEN
        SELECT id, is_active, verification_status INTO _rider_id, _is_active, _verification_status
        FROM public.riders
        WHERE email = _email
        AND (user_id IS NULL OR user_id = _user_id)
        LIMIT 1;
    END IF;

    -- Attempt 2: Find by Phone (Standard)
    IF _rider_id IS NULL AND _phone IS NOT NULL THEN
        SELECT id, is_active, verification_status INTO _rider_id, _is_active, _verification_status
        FROM public.riders
        WHERE phone = ANY(_rider_phone_variants)
        AND (user_id IS NULL OR user_id = _user_id)
        LIMIT 1;
    END IF;

    -- Attempt 3: [NEW] Find by Phone extracted from Sync Email (user_9233...@fasthaazir.app)
    IF _rider_id IS NULL AND _email LIKE 'user_%@fasthaazir.app' THEN
         _email_phone_part := substring(_email from 'user_([0-9]+)@');
         
         IF _email_phone_part IS NOT NULL THEN
            SELECT id, is_active, verification_status INTO _rider_id, _is_active, _verification_status
            FROM public.riders
            WHERE (
                phone = _email_phone_part 
                OR phone = '+' || _email_phone_part
                OR phone = REPLACE(_email_phone_part, '92', '0')
             )
            AND (user_id IS NULL OR user_id = _user_id)
            LIMIT 1;
         END IF;
    END IF;


    -- If found, LINK IT!
    IF _rider_id IS NOT NULL THEN
        -- 1. Link Rider Table
        UPDATE public.riders
        SET user_id = _user_id,
            email = COALESCE(email, _email)
            -- Don't overwrite phone if it's already there
        WHERE id = _rider_id;

        -- 2. Update Profile Role
        UPDATE public.profiles
        SET role = 'rider',
            status = 'active', -- Ensure active status
            updated_at = now()
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
