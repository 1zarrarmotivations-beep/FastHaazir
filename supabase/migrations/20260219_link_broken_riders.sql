-- Function to fix broken/unlinked rider profiles
-- Call this when a user logs in and suspects they are a rider but have 'customer' role
CREATE OR REPLACE FUNCTION public.claim_rider_profile()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    _user_id uuid;
    _email text;
    _phone text;
    _rider_id uuid;
    _is_active boolean;
    _verification_status text;
    _count int;
BEGIN
    _user_id := auth.uid();
    
    -- Get email and phone from auth.users (safer than trusting input)
    SELECT email, phone INTO _email, _phone
    FROM auth.users
    WHERE id = _user_id;

    -- Normalize phone (basic)
    -- If phone starts with '+', keep it. If not, maybe try adding it?
    -- For now, let's just search by what we have.

    -- Attempt 1: Find by Email (if present)
    IF _email IS NOT NULL THEN
        SELECT id, is_active, verification_status INTO _rider_id, _is_active, _verification_status
        FROM public.riders
        WHERE email = _email
        AND (user_id IS NULL OR user_id = _user_id) -- Only if unlinked or already linked to self
        LIMIT 1;
    END IF;

    -- Attempt 2: Find by Phone (if not found by email)
    IF _rider_id IS NULL AND _phone IS NOT NULL THEN
        -- Try exact match or match without leading + or 0
        SELECT id, is_active, verification_status INTO _rider_id, _is_active, _verification_status
        FROM public.riders
        WHERE (
            phone = _phone OR 
            phone = replace(_phone, '+', '') OR
            phone = replace(replace(_phone, '+', ''), '92', '0') -- 923... -> 03...
        )
        AND (user_id IS NULL OR user_id = _user_id)
        LIMIT 1;
    END IF;

    -- If found, LINK IT!
    IF _rider_id IS NOT NULL THEN
        -- 1. Link Rider Table
        UPDATE public.riders
        SET user_id = _user_id,
            email = COALESCE(email, _email), -- Backfill email if missing
            phone = COALESCE(phone, _phone)  -- Backfill phone if missing
        WHERE id = _rider_id;

        -- 2. Update Profile Role
        UPDATE public.profiles
        SET role = 'rider'
        WHERE user_id = _user_id;

        -- 3. Sync User Roles (redundant if trigger works, but safe)
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

    -- Look for Admin too?
    -- (Omitted for now, focus on Rider)

    RETURN jsonb_build_object(
        'success', false,
        'message', 'No matching unlinked rider profile found.'
    );
END;
$$;
