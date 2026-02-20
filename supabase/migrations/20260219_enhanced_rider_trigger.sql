-- Enhanced Trigger for Auto-Linking Riders on Creation
-- Now checks for "Fake Email" logins (user_92...@...) in auth.users

CREATE OR REPLACE FUNCTION public.handle_new_rider_link()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _existing_user_id uuid;
    _rider_phone_raw text;
    _rider_phone_normalized text;
    _rider_phone_92 text;
BEGIN
    -- Only proceed if user_id is NULL (unlinked)
    IF NEW.user_id IS NULL AND NEW.phone IS NOT NULL THEN
        _rider_phone_raw := NEW.phone;
        
        -- Normalize Rider Phone to 923... (if 03...)
        IF _rider_phone_raw LIKE '03%' THEN
           _rider_phone_92 := '92' || substring(_rider_phone_raw, 2);
        ELSE
           _rider_phone_92 := _rider_phone_raw;
        END IF;

        -- 1. Check by Auth Email (Exact Match) - rare but possible
        IF NEW.email IS NOT NULL THEN
            SELECT id INTO _existing_user_id FROM auth.users WHERE email = NEW.email LIMIT 1;
        END IF;

        -- 2. Check by Auth Phone (if not found)
        IF _existing_user_id IS NULL THEN
            -- Check for exact match or normalized 92...
            SELECT id INTO _existing_user_id FROM auth.users 
            WHERE phone = _rider_phone_raw 
               OR phone = _rider_phone_92
               OR phone = '+' || _rider_phone_92 -- +923...
            LIMIT 1;
        END IF;

        -- 3. Check by "Fake Email" in Auth Users (user_92...@...)
        IF _existing_user_id IS NULL THEN
            -- We are looking for an auth user whose email contains the rider's phone
            -- Email format: user_923365476480@fasthaazir.app
            -- Rider phone might be 03365476480 or 923365476480
            
            -- We want to match `user_` + `92...` + `@`
            -- So we need the 92 version of the rider phone
            
            SELECT id INTO _existing_user_id FROM auth.users 
            WHERE email ILIKE 'user_' || _rider_phone_92 || '@%'
            LIMIT 1;
        END IF;

        -- If matching user found, LINK THEM
        IF _existing_user_id IS NOT NULL THEN
            -- Update THIS rider record
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

-- No need to drop trigger, just replace function logic
