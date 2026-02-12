-- Create customer_addresses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    address_text TEXT NOT NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Select: Users can view their own addresses
CREATE POLICY "Users can view their own addresses" 
ON public.customer_addresses FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Insert: Users can add their own addresses
CREATE POLICY "Users can add their own addresses" 
ON public.customer_addresses FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Update: Users can update their own addresses
CREATE POLICY "Users can update their own addresses" 
ON public.customer_addresses FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Delete: Users can delete their own addresses
CREATE POLICY "Users can delete their own addresses" 
ON public.customer_addresses FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_id ON public.customer_addresses(user_id);

-- Trigger for update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_customer_addresses_updated_at ON public.customer_addresses;

CREATE TRIGGER update_customer_addresses_updated_at
    BEFORE UPDATE ON public.customer_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
