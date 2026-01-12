-- Create push_device_tokens table for storing device tokens
CREATE TABLE public.push_device_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_token)
);

-- Create push_notifications table for storing sent notifications
CREATE TABLE public.push_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_role TEXT, -- NULL means all users
  target_user_id UUID, -- For single user targeting
  action_route TEXT, -- Deep link route
  sent_by UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

-- RLS for device tokens
CREATE POLICY "Users can manage their own device tokens"
  ON public.push_device_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all device tokens"
  ON public.push_device_tokens
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for push notifications
CREATE POLICY "Admins can manage push notifications"
  ON public.push_notifications
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view notifications sent to them"
  ON public.push_notifications
  FOR SELECT
  USING (target_user_id = auth.uid() OR target_role IS NULL);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_notifications;