-- Update God Mode Number check to include all variations
CREATE OR REPLACE FUNCTION public.is_god_mode_number(_phone text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
    -- Normalize input by removing all non-digits
    -- This handles +92..., 92..., 03... consistently
    -- But for safety, let's just list the specific known variations explicitly
    RETURN _phone IN (
      '+923110111419', 
      '923110111419', 
      '03110111419', 
      '3110111419'
    );
END;
$$;
