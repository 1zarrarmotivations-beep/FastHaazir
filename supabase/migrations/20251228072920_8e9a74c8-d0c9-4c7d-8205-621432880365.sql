-- Enable realtime for tables (using IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rider_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_requests;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'riders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.riders;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'businesses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.businesses;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL for complete row data in realtime
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.rider_requests REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.riders REPLICA IDENTITY FULL;
ALTER TABLE public.businesses REPLICA IDENTITY FULL;

-- Add ranking_score to businesses for dynamic ranking
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS ranking_score numeric DEFAULT 0;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS online_since timestamp with time zone;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS total_orders integer DEFAULT 0;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS completion_rate numeric DEFAULT 100;

-- Create function to update business ranking dynamically
CREATE OR REPLACE FUNCTION public.calculate_business_ranking()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.ranking_score := (
    CASE WHEN NEW.is_active THEN 50 ELSE 0 END +
    COALESCE(NEW.rating, 4.5) * 10 +
    CASE WHEN NEW.featured THEN 20 ELSE 0 END +
    COALESCE(NEW.completion_rate, 100) * 0.2
  );
  RETURN NEW;
END;
$$;

-- Trigger for ranking calculation
DROP TRIGGER IF EXISTS trigger_calculate_business_ranking ON public.businesses;
CREATE TRIGGER trigger_calculate_business_ranking
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.calculate_business_ranking();

-- Add blocked status to riders and businesses
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;

-- Function to send system notification (for admin use)
CREATE OR REPLACE FUNCTION public.send_system_notification(
  _title text,
  _message text,
  _user_ids uuid[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  IF _user_ids IS NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT user_id, _title, _message, 'system'
    FROM public.customer_profiles;
  ELSE
    FOREACH _user_id IN ARRAY _user_ids
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (_user_id, _title, _message, 'system');
    END LOOP;
  END IF;
END;
$$;