-- Enhance Support Tickets Table
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES admins(id),
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'customer' CHECK (user_type IN ('customer', 'rider', 'admin'));

-- Enhance Support Messages Table
ALTER TABLE support_messages
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'system')),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Admin Online Status Tracking
CREATE TABLE IF NOT EXISTS admin_presence (
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE PRIMARY KEY,
  is_online BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Admin Presence
ALTER TABLE admin_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all presence" ON admin_presence
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update their own presence" ON admin_presence
  FOR UPDATE USING (admin_id = auth.uid());

CREATE POLICY "Admins can insert their own presence" ON admin_presence
  FOR INSERT WITH CHECK (admin_id = auth.uid());

-- Function to Auto-Update Last Active
CREATE OR REPLACE FUNCTION update_admin_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_active
BEFORE UPDATE ON admin_presence
FOR EACH ROW
EXECUTE FUNCTION update_admin_last_active();

-- Seed some simple auto-replies (Conceptual - implemented in frontend logic for now to avoid complexity)
-- In a larger system, we'd store these in a table.
