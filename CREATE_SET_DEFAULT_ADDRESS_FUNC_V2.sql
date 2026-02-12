CREATE OR REPLACE FUNCTION public.set_default_customer_address(p_address_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- Check if user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- 1. Set all addresses for this user to is_default = false
    UPDATE public.customer_addresses
    SET is_default = false
    WHERE user_id = v_user_id;

    -- 2. Set the specified address to is_default = true
    UPDATE public.customer_addresses
    SET is_default = true
    WHERE id = p_address_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
