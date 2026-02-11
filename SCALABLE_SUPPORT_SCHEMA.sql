-- ===================================================================================
-- SCALABLE REAL-TIME SUPPORT CHAT SYSTEM SCHEMA
-- ===================================================================================

-- 1. CLEANUP PREVIOUS TABLES (IF ANY)
DROP TABLE IF EXISTS support_messages CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS admin_presence CASCADE;
DROP TABLE IF EXISTS auto_reply_templates CASCADE;

-- 2. CREATE FUNCTION: UPDATE TIMESTAMP
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. SUPPORT TICKETS TABLE (The Core Entity)
CREATE TABLE support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Admin assigned
  
  -- Core Fields
  subject TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('order_issue', 'payment', 'rider', 'technical', 'other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'escalated')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Metadata & Tracking
  user_type TEXT DEFAULT 'customer' CHECK (user_type IN ('customer', 'rider', 'admin')),
  metadata JSONB DEFAULT '{}'::jsonb, -- Store order_id, context, etc.
  unanswered_count INTEGER DEFAULT 0, -- For escalation logic
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Standard Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for specific queries (crucial for scalability)
CREATE INDEX idx_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_tickets_last_message_at ON support_tickets(last_message_at DESC); -- For admin dashboard sorting

-- Trigger for updated_at
CREATE TRIGGER update_tickets_timestamp
BEFORE UPDATE ON support_tickets
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 4. SUPPORT MESSAGES TABLE (The Conversation Log)
CREATE TABLE support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Can be NULL for system messages
  
  -- Message Content
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'system')),
  
  -- Status Tracking
  read_at TIMESTAMPTZ, -- If NULL, message is unread
  
  -- Standard Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for chat loading (crucial for scalability)
CREATE INDEX idx_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX idx_messages_created_at ON support_messages(created_at ASC); -- Pagination

-- 5. ADMIN PRESENCE TABLE (Real-time Availability)
CREATE TABLE admin_presence (
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'busy', 'offline')),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_admin_presence_last_active ON admin_presence(last_active_at);

-- 6. AUTO REPLY TEMPLATES (Configurable Automation)
CREATE TABLE auto_reply_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL UNIQUE, -- matches ticket category
  keywords TEXT[] DEFAULT '{}', -- Array of keywords to trigger this template
  reply_ur TEXT NOT NULL,
  reply_en TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Templates
INSERT INTO auto_reply_templates (category, keywords, reply_ur, reply_en) VALUES
('order_issue', ARRAY['late', 'delivery', 'wait', 'kahan', 'delay'], 'آپ کا آرڈر سسٹم میں چیک کیا جا رہا ہے۔ رائڈر کو نوٹیفائی کر دیا گیا ہے۔', 'Checking your order in the system. Rider has been notified.'),
('payment', ARRAY['refund', 'paisay', 'deduct', 'failed', 'wallet'], 'اگر رقم کٹ گئی ہے تو 5-10 منٹ انتظار کریں۔ ریفنڈ 24 گھنٹے میں پروسیس ہوتا ہے۔', 'Please wait 5-10 mins if amount was deducted. Refunds process in 24 hours.'),
('rider', ARRAY['rude', 'location', 'behavior', 'call'], 'ایپ کو ریفریش کریں اور دوبارہ ٹرائی کریں۔ اگر مسئلہ جاری رہے تو اسکرین شاٹ بھیجیں۔', 'Refresh the app and try again. Send a screenshot if issue persists.'),
('technical', ARRAY['crash', 'bug', 'error', 'login', 'otp'], 'ہماری ٹیکنیکل ٹیم کو اطلاع دے دی گئی ہے۔', 'Our technical team has been notified.'),
('other', ARRAY['help', 'madad', 'question'], 'السلام علیکم! ہم آپ کی کیا مدد کر سکتے ہیں؟', 'Assalam-o-Alaikum! How can we help you?');

-- ===================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================================

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_reply_templates ENABLE ROW LEVEL SECURITY;

-- --- TICKETS POLICIES ---

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create tickets
CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view ALL tickets (Assumes 'admin' role logic exists via claim or table join)
-- Simplified check: If assigned_to is NOT NULL (meaning created by admin) OR based on role table
-- For scalability in Supabase, we usually use a custom claim or a lookup.
-- Here we will use a common pattern: Check if auth.uid() exists in an 'admins' table.
-- Assuming 'admins' table exists from previous migrations.
CREATE POLICY "Admins can view all tickets" ON support_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- --- MESSAGES POLICIES ---

-- Users can view messages for their tickets
CREATE POLICY "Users can view messages for own tickets" ON support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = support_messages.ticket_id 
      AND support_tickets.user_id = auth.uid()
    )
  );

-- Users can insert messages to their own tickets
CREATE POLICY "Users can insert messages to own tickets" ON support_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = ticket_id 
      AND support_tickets.user_id = auth.uid()
    )
  );

-- Admins can do anything with messages
CREATE POLICY "Admins can manage all messages" ON support_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- --- ADMIN PRESENCE POLICIES ---

-- Anyone can view admin presence (to show online status)
CREATE POLICY "Public view admin presence" ON admin_presence
  FOR SELECT USING (true);

-- Only admins can update their own presence
CREATE POLICY "Admins update own presence" ON admin_presence
  FOR UPDATE USING (auth.uid() = admin_id);

-- Only admins can insert their own presence
CREATE POLICY "Admins insert own presence" ON admin_presence
  FOR INSERT WITH CHECK (auth.uid() = admin_id);

-- --- AUTO REPLY TEMPLATES POLICIES ---

-- Everyone can view templates (for client-side optimistic UI if needed)
CREATE POLICY "Public view templates" ON auto_reply_templates
  FOR SELECT USING (true);

-- Only admins manage templates
CREATE POLICY "Admins manage templates" ON auto_reply_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- ===================================================================================
-- AUTOMATION TRIGGERS & FUNCTIONS
-- ===================================================================================

-- Function: Auto-Update Ticket on New Message
CREATE OR REPLACE FUNCTION handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update ticket's last_message_at
  UPDATE support_tickets 
  SET 
    last_message_at = NOW(),
    unanswered_count = CASE 
      WHEN NEW.is_admin = FALSE THEN unanswered_count + 1 
      ELSE 0 -- Admin replied, reset count
    END,
    status = CASE 
      WHEN NEW.is_admin = TRUE THEN 'in_progress' -- Admin replied, so it's in progress
      ELSE status
    END
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_message
AFTER INSERT ON support_messages
FOR EACH ROW EXECUTE FUNCTION handle_new_message();
