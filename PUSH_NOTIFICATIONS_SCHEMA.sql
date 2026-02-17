-- Create device_tokens table to store FCM tokens
CREATE TABLE IF NOT EXISTS public.device_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('customer', 'rider', 'admin')),
    device_token TEXT NOT NULL,
    platform TEXT CHECK (platform IN ('android', 'ios', 'web')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_token)
);

-- Enable RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can insert their own tokens
CREATE POLICY "Users can insert their own device tokens" 
ON public.device_tokens FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Users can see their own tokens
CREATE POLICY "Users can view their own device tokens" 
ON public.device_tokens FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update their own device tokens" 
ON public.device_tokens FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete their own device tokens" 
ON public.device_tokens FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Create notifications_log table
CREATE TABLE IF NOT EXISTS public.notifications_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    user_role TEXT, -- 'all', 'rider', 'customer', 'specific'
    target_user_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'sent', -- 'sent', 'failed'
    response_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- Admins can view logs
CREATE POLICY "Admins can view notification logs"
ON public.notifications_log FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can insert logs (via backend service role mostly, but admin panel might need too)
CREATE POLICY "Admins can insert notification logs"
ON public.notifications_log FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));
