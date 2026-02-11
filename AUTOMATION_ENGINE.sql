-- ===================================================================================
-- BACKEND AUTOMATION ENGINE
-- Handles Smart Auto-Replies using Database Triggers (No external server needed)
-- ===================================================================================

-- 1. FUNCTION: Process Auto-Reply
CREATE OR REPLACE FUNCTION process_auto_reply()
RETURNS TRIGGER AS $$
DECLARE
  ticket_category TEXT;
  reply_text_ur TEXT;
  reply_text_en TEXT;
  matched_template RECORD;
  should_reply BOOLEAN := FALSE;
BEGIN
  -- Only process if message is from USER (not admin) and type is text
  IF NEW.is_admin = TRUE OR NEW.type != 'text' THEN
    RETURN NEW;
  END IF;

  -- Get ticket info
  SELECT category INTO ticket_category FROM support_tickets WHERE id = NEW.ticket_id;

  -- 1. Try to find a keyword match in templates
  -- We prioritize templates that match the ticket's category first? 
  -- actually, let's just search all active templates.
  
  FOR matched_template IN SELECT * FROM auto_reply_templates WHERE is_active = TRUE LOOP
    -- Simple keyword check (case insensitive)
    -- This checks if any keyword in the array is present in the message
    IF EXISTS (
      SELECT 1 
      FROM unnest(matched_template.keywords) k 
      WHERE NEW.message ILIKE '%' || k || '%'
    ) THEN
      reply_text_ur := matched_template.reply_ur;
      reply_text_en := matched_template.reply_en;
      should_reply := TRUE;
      EXIT; -- Stop at first match
    END IF;
  END LOOP;

  -- 2. If no keyword match found, do NOT send a default reply every time to avoid spamming.
  -- Only send if explicitly matched.

  -- 3. Insert Auto-Reply if match found
  IF should_reply THEN
    INSERT INTO support_messages (ticket_id, sender_id, message, is_admin, type)
    VALUES (
      NEW.ticket_id,
      NULL, -- System/Bot has no user ID
      reply_text_ur || E'\n--\n' || reply_text_en, -- Combine Urdu and English with divider
      TRUE, -- Marked as admin/system so it appears on the left side for user
      'system'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TRIGGER: Connect Function to Table
DROP TRIGGER IF EXISTS trigger_auto_reply ON support_messages;

CREATE TRIGGER trigger_auto_reply
AFTER INSERT ON support_messages
FOR EACH ROW
EXECUTE FUNCTION process_auto_reply();

-- 3. TEST HELPERS (Optional)
-- You can run this to test if the trigger works after applying
-- INSERT INTO support_messages (ticket_id, message, is_admin) VALUES ('<ticket_id>', 'My order is late', false);
