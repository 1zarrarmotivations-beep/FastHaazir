-- Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    category TEXT NOT NULL, -- 'late_order', 'payment', 'app_issue', 'rider_issue', 'other'
    subject TEXT,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
    priority TEXT NOT NULL DEFAULT 'medium',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support Messages Table
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_system BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Policies for Tickets
CREATE POLICY "Users can view their own tickets"
    ON public.support_tickets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
    ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
    ON public.support_tickets FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    ));

CREATE POLICY "Admins can update tickets"
    ON public.support_tickets FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    ));

-- Policies for Messages
CREATE POLICY "Users can view messages for their tickets"
    ON public.support_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.support_tickets
        WHERE id = ticket_id AND user_id = auth.uid()
    ));

CREATE POLICY "Users can insert messages to their tickets"
    ON public.support_messages FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.support_tickets
        WHERE id = ticket_id AND user_id = auth.uid()
    ));

CREATE POLICY "Admins can view all support messages"
    ON public.support_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    ));

CREATE POLICY "Admins can insert support messages"
    ON public.support_messages FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    ));

-- Functions for real-time notifications (optional but good)
-- We can use Supabase Realtime for most things.
