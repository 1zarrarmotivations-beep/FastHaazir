-- ============================================================================
-- GLOBAL ADMIN POLICY CONVERSION
-- Converts all legacy 'admins' table checks to 'profiles' role checks
-- ============================================================================

DO $$ 
DECLARE
    table_name_var text;
    policy_name_var text;
BEGIN
    -- List of tables to apply God Mode to
    FOR table_name_var IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('orders', 'riders', 'businesses', 'rider_wallets', 'wallet_transactions', 
                          'pricing_plans', 'support_tickets', 'support_messages', 'order_ratings', 
                          'product_ratings', 'anomaly_alerts', 'audit_logs', 'rider_applications')
    LOOP
        -- 1. Drop old policies
        FOR policy_name_var IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = table_name_var 
              AND (policyname LIKE '%Admin%' OR policyname LIKE '%God Mode%')
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name_var, table_name_var);
        END LOOP;

        -- 2. Create New Robust Admin Policy
        EXECUTE format('
            CREATE POLICY "Admins God Mode" ON public.%I
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE user_id = auth.uid() 
                      AND role IN (''admin'', ''super_admin'')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE user_id = auth.uid() 
                      AND role IN (''admin'', ''super_admin'')
                )
            )', table_name_var);
            
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name_var);
    END LOOP;
END $$;
