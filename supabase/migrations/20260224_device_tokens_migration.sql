-- Migration: Device Tokens Table Enhancement
-- Adds missing columns to device_tokens table for OneSignal integration
-- Date: 2026-02-24

-- Add missing columns if they don't exist (for OneSignal player IDs)
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS app_version TEXT;
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON device_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(is_active) WHERE is_active = true;

-- Create trigger to auto-deactivate old tokens for same user/platform
CREATE OR REPLACE FUNCTION deactivate_old_tokens()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE device_tokens
    SET is_active = false
    WHERE user_id = NEW.user_id
      AND platform = NEW.platform
      AND id != NEW.id
      AND is_active = true;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_deactivate_old_tokens ON device_tokens;
CREATE TRIGGER trigger_deactivate_old_tokens
    AFTER INSERT ON device_tokens
    FOR EACH ROW
    EXECUTE FUNCTION deactivate_old_tokens();

COMMENT ON TABLE device_tokens IS 'Stores device push notification tokens for users';
