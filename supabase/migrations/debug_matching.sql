-- Test script to debug matching logic
DO $$
DECLARE
    _email text := 'user_923365476480@fasthaazir.app';
    _extracted_phone text;
    _rider_id uuid;
    _match_variant text;
BEGIN
    _extracted_phone := substring(_email from 'user_([0-9]+)@');
    RAISE NOTICE 'Extracted Phone: %', _extracted_phone;

    -- Test Regex Replace
    RAISE NOTICE 'Normalized (0...): %', regexp_replace(_extracted_phone, '^\+?92', '0');

    -- Try to find rider
    SELECT id, phone INTO _rider_id, _match_variant
    FROM ridrs -- TYPO INTENTIONAL TO FAIL IF I DON'T CATCH IT? No, writing to file.
    WHERE (
        phone = _extracted_phone OR
        phone = regexp_replace(_extracted_phone, '^\+?92', '0') OR
        phone = '0' || _extracted_phone
    );
    
    -- Correct table name
    SELECT id, phone INTO _rider_id, _match_variant
    FROM public.riders
    WHERE (
        phone = _extracted_phone OR
        phone = regexp_replace(_extracted_phone, '^\+?92', '0') OR
        phone = '0' || _extracted_phone
    )
    LIMIT 1;

    RAISE NOTICE 'Found Rider ID: %, Phone: %', _rider_id, _match_variant;
END $$;
