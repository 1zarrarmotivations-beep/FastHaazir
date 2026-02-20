CREATE OR REPLACE FUNCTION public.get_unified_role(target_user_id uuid DEFAULT auth.uid())
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _role app_role;
    _profile_status text;
    _is_blocked boolean;
    _rider_status text;
    _rider_active boolean;
    _final_role text;
    _final_status text;
BEGIN
    SELECT role, status, is_blocked INTO _role, _profile_status, _is_blocked
    FROM public.profiles
    WHERE user_id = target_user_id;

    IF _role IS NULL THEN
        RETURN jsonb_build_object(
            'role', 'customer',
            'status', 'active',
            'is_blocked', false
        );
    END IF;

    _final_role := _role::text;

    IF _final_role = 'admin' OR _final_role = 'super_admin' THEN
        RETURN jsonb_build_object(
            'role', 'admin',
            'status', 'approved',
            'is_blocked', COALESCE(_is_blocked, false)
        );
    END IF;

    IF _final_role = 'rider' THEN
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
    -- Fallback safety
    RETURN jsonb_build_object('role', 'customer', 'status', 'error', 'is_blocked', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unified_role(uuid) TO authenticated;
