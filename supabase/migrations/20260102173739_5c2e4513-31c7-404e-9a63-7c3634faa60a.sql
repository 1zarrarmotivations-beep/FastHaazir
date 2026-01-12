-- Create triggers to normalize phone numbers on insert/update
-- This ensures database always has consistent 923XXXXXXXXX format

CREATE OR REPLACE TRIGGER normalize_riders_phone
  BEFORE INSERT OR UPDATE ON public.riders
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_phone_column_trigger();

CREATE OR REPLACE TRIGGER normalize_admins_phone
  BEFORE INSERT OR UPDATE ON public.admins
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_phone_column_trigger();

CREATE OR REPLACE TRIGGER normalize_businesses_owner_phone
  BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_owner_phone_column_trigger();

-- Backfill existing data to normalized format
UPDATE public.riders SET phone = public.normalize_pk_phone_digits(phone) WHERE phone IS NOT NULL;
UPDATE public.admins SET phone = public.normalize_pk_phone_digits(phone) WHERE phone IS NOT NULL;
UPDATE public.businesses SET owner_phone = public.normalize_pk_phone_digits(owner_phone) WHERE owner_phone IS NOT NULL;