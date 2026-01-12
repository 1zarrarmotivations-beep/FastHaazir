-- Create customer_addresses table for saved addresses
CREATE TABLE public.customer_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'Home',
  address_text TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

-- Users can view their own addresses
CREATE POLICY "Users can view their own addresses"
ON public.customer_addresses
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own addresses
CREATE POLICY "Users can create their own addresses"
ON public.customer_addresses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own addresses
CREATE POLICY "Users can update their own addresses"
ON public.customer_addresses
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own addresses
CREATE POLICY "Users can delete their own addresses"
ON public.customer_addresses
FOR DELETE
USING (auth.uid() = user_id);

-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  order_updates BOOLEAN NOT NULL DEFAULT true,
  rider_messages BOOLEAN NOT NULL DEFAULT true,
  promotions BOOLEAN NOT NULL DEFAULT true,
  system_alerts BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view their own notification settings"
ON public.notification_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own settings
CREATE POLICY "Users can create their own notification settings"
ON public.notification_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update their own notification settings"
ON public.notification_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Add profile_image column to customer_profiles
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- Create indexes
CREATE INDEX idx_customer_addresses_user_id ON public.customer_addresses(user_id);
CREATE INDEX idx_notification_settings_user_id ON public.notification_settings(user_id);

-- Trigger to ensure only one default address per user
CREATE OR REPLACE FUNCTION public.handle_default_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.customer_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_default_address
BEFORE INSERT OR UPDATE ON public.customer_addresses
FOR EACH ROW
EXECUTE FUNCTION public.handle_default_address();