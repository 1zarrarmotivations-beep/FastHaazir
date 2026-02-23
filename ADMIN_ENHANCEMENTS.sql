-- Admin Enhancements: Audit Logs and System Settings Tables
-- Created: 2026-02-23

-- 1. Audit Logs Table - Track all admin actions
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_name TEXT,
    admin_phone TEXT,
    action_type TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id TEXT,
    old_value JSONB,
    new_value JSONB,
    description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_table ON admin_audit_logs(target_table);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- 2. System Settings Table - Store global configuration
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    setting_type TEXT NOT NULL DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(category, setting_key)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- 3. Default System Settings
INSERT INTO system_settings (category, setting_key, setting_value, setting_type, description) VALUES
-- Delivery Fees
('delivery_fees', 'base_fee', '50', 'number', 'Base delivery fee in PKR'),
('delivery_fees', 'per_km_fee', '10', 'number', 'Per kilometer delivery fee in PKR'),
('delivery_fees', 'max_free_distance_km', '2', 'number', 'Maximum distance for free delivery in KM'),

-- Minimum Order Amounts
('min_orders', 'restaurant_min_order', '200', 'number', 'Minimum order amount for restaurants'),
('min_orders', 'grocery_min_order', '500', 'number', 'Minimum order amount for grocery'),
('min_orders', 'bakery_min_order', '300', 'number', 'Minimum order amount for bakery'),
('min_orders', 'pharmacy_min_order', '200', 'number', 'Minimum order amount for pharmacy'),
('min_orders', 'shop_min_order', '500', 'number', 'Minimum order amount for shops'),

-- Commission Rates
('commissions', 'default_rider_commission', '10', 'number', 'Default commission percentage for riders'),
('commissions', 'restaurant_commission', '15', 'number', 'Default commission for restaurants'),
('commissions', 'grocery_commission', '12', 'number', 'Default commission for grocery'),
('commissions', 'bakery_commission', '15', 'number', 'Default commission for bakeries'),
('commissions', 'pharmacy_commission', '10', 'number', 'Default commission for pharmacy'),
('commissions', 'shop_commission', '12', 'number', 'Default commission for shops'),

-- Wallet Limits
('wallet_limits', 'min_wallet_balance', '0', 'number', 'Minimum wallet balance allowed'),
('wallet_limits', 'max_wallet_balance', '100000', 'number', 'Maximum wallet balance allowed'),
('wallet_limits', 'min_withdrawal', '500', 'number', 'Minimum withdrawal amount'),
('wallet_limits', 'max_withdrawal', '50000', 'number', 'Maximum withdrawal amount per transaction'),

-- Feature Toggles
('features', 'delivery_enabled', 'true', 'boolean', 'Enable delivery feature'),
('features', 'pickup_enabled', 'true', 'boolean', 'Enable pickup feature'),
('features', 'scheduled_delivery', 'false', 'boolean', 'Enable scheduled delivery'),
('features', 'grocery_enabled', 'true', 'boolean', 'Enable grocery category'),
('features', 'pharmacy_enabled', 'true', 'boolean', 'Enable pharmacy category'),
('features', 'maintenance_mode', 'false', 'boolean', 'Enable maintenance mode (shows warning to users)'),

-- Order Settings
('order_settings', 'order_timeout_minutes', '15', 'number', 'Order auto-cancel timeout in minutes'),
('order_settings', 'max_order_items', '50', 'number', 'Maximum items per order'),
('order_settings', 'allow_cod', 'true', 'boolean', 'Allow cash on delivery'),

-- Notification Settings
('notifications', 'sms_notifications', 'true', 'boolean', 'Enable SMS notifications'),
('notifications', 'push_notifications', 'true', 'boolean', 'Enable push notifications'),
('notifications', 'email_notifications', 'false', 'boolean', 'Enable email notifications')
ON CONFLICT (category, setting_key) DO NOTHING;

-- 4. Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id UUID,
    p_admin_name TEXT,
    p_admin_phone TEXT,
    p_action_type TEXT,
    p_target_table TEXT,
    p_target_id TEXT DEFAULT NULL,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO admin_audit_logs (
        admin_id,
        admin_name,
        admin_phone,
        action_type,
        target_table,
        target_id,
        old_value,
        new_value,
        description
    ) VALUES (
        p_admin_id,
        p_admin_name,
        p_admin_phone,
        p_action_type,
        p_target_table,
        p_target_id,
        p_old_value,
        p_new_value,
        p_description
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to update system settings
CREATE OR REPLACE FUNCTION update_system_setting(
    p_category TEXT,
    p_setting_key TEXT,
    p_setting_value TEXT,
    p_updated_by UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE system_settings
    SET setting_value = p_setting_value,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE category = p_category AND setting_key = p_setting_key;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Setting not found: %.%', p_category, p_setting_key;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Enable RLS on new tables
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for audit logs
CREATE POLICY "Admins can view audit logs" ON admin_audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    );

CREATE POLICY "Service role can manage audit logs" ON admin_audit_logs
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 8. RLS Policies for system settings
CREATE POLICY "Authenticated users can view system settings" ON system_settings
    FOR SELECT TO authenticated
    USING (is_active = true);

CREATE POLICY "Admins can update system settings" ON system_settings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    );

CREATE POLICY "Service role can manage system settings" ON system_settings
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 9. Grant necessary permissions
GRANT SELECT ON admin_audit_logs TO authenticated;
GRANT INSERT ON admin_audit_logs TO authenticated;
GRANT SELECT ON system_settings TO authenticated;
GRANT UPDATE ON system_settings TO authenticated;

-- 10. Create admin activity view
CREATE OR REPLACE VIEW admin_activity_view AS
SELECT 
    a.id,
    a.admin_name,
    a.admin_phone,
    a.action_type,
    a.target_table,
    a.description,
    a.created_at
FROM admin_audit_logs a
ORDER BY a.created_at DESC
LIMIT 100;

-- 11. Create function to get active admins (admins who performed actions in last 24 hours)
CREATE OR REPLACE FUNCTION get_active_admins()
RETURNS TABLE(
    admin_id UUID,
    admin_name TEXT,
    admin_phone TEXT,
    last_action TIMESTAMPTZ,
    action_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.admin_id,
        a.admin_name,
        a.admin_phone,
        MAX(a.created_at) as last_action,
        COUNT(*)::BIGINT as action_count
    FROM admin_audit_logs a
    WHERE a.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY a.admin_id, a.admin_name, a.admin_phone
    ORDER BY action_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
