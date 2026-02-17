-- Create device_tokens table to match backend logic
CREATE TABLE IF NOT EXISTS public.device_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    device_token TEXT NOT NULL,
    platform TEXT DEFAULT 'web',
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_token)
);

-- Enable RLS for device_tokens
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Policies for device_tokens
CREATE POLICY "Users can insert their own device tokens"
ON public.device_tokens FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device tokens"
ON public.device_tokens FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device tokens"
ON public.device_tokens FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all device tokens"
ON public.device_tokens FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create notifications_log table to match backend logic
CREATE TABLE IF NOT EXISTS public.notifications_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    user_role TEXT,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    response_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for notifications_log
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- Policies for notifications_log
CREATE POLICY "Admins can insert notification logs"
ON public.notifications_log FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view notification logs"
ON public.notifications_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Grant access to authenticated users to view logs targeted at them (optional, if you want history)
CREATE POLICY "Users can view their own notifications"
ON public.notifications_log FOR SELECT
TO authenticated
USING (target_user_id = auth.uid());
