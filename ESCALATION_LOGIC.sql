-- ===================================================================================
-- ESCALATION & CLEANUP LOGIC
-- Enforces "3 Messages Rule" and manages Admin Presence
-- ===================================================================================

-- 1. FUNCTION: Check Escalation on New Message
-- Extends the existing handle_new_message logic (or replaces it) via a separate trigger
CREATE OR REPLACE FUNCTION check_escalation()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Only check if message is from user
  IF NEW.is_admin = TRUE THEN
    RETURN NEW;
  END IF;

  -- Get current unresolved count
  SELECT unanswered_count INTO current_count FROM support_tickets WHERE id = NEW.ticket_id;

  -- If count reaches 3 (meaning this is the 3rd or 4th message without reply)
  -- Note: The previous trigger 'on_new_message' already incremented it. 
  -- So if it was 2, it became 3.
  
  -- Let's query the UPDATED ticket row to be safe, or just trust the flow.
  -- Better to update independent of the other trigger to avoid race conditions/dependency order.
  
  IF current_count >= 3 THEN
    UPDATE support_tickets 
    SET 
      status = 'escalated',
      priority = 'urgent'
    WHERE id = NEW.ticket_id AND status != 'escalated';
    
    -- Optional: Insert a system message notifying user of escalation
    -- Only insert if we haven't already escalated recently? 
    -- For simplicity, we just escalate.
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TRIGGER: Connect Escalation Function
DROP TRIGGER IF EXISTS trigger_check_escalation ON support_messages;

CREATE TRIGGER trigger_check_escalation
AFTER INSERT ON support_messages
FOR EACH ROW
EXECUTE FUNCTION check_escalation();


-- 3. FUNCTION: Clean Up Inactive Admins (Optional Maintenance)
-- This can be run via pg_cron or called periodically by admin client
CREATE OR REPLACE FUNCTION cleanup_offline_admins()
RETURNS void AS $$
BEGIN
  UPDATE admin_presence 
  SET status = 'offline' 
  WHERE last_active_at < NOW() - INTERVAL '5 minutes' AND status != 'offline';
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT cleanup_offline_admins();
