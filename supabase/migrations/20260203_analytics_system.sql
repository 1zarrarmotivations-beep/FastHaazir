-- ============================================================================
-- FAST HAAZIR - COMPREHENSIVE ANALYTICS SYSTEM
-- Created: February 3, 2026
-- Purpose: Track all user interactions, traffic, and system metrics
-- ============================================================================

-- ============================================================================
-- 1. PAGE VIEWS & SESSIONS
-- ============================================================================

-- Page views table (tracks every page visit)
CREATE TABLE IF NOT EXISTS public.analytics_page_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    page_path text NOT NULL,
    page_title text,
    referrer text,
    user_agent text,
    device_type text CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
    browser text,
    os text,
    country text,
    city text,
    ip_address inet,
    duration_seconds integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Sessions table (tracks user sessions)
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    session_start timestamptz NOT NULL DEFAULT now(),
    session_end timestamptz,
    is_active boolean DEFAULT true,
    device_type text CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
    browser text,
    os text,
    country text,
    city text,
    ip_address inet,
    entry_page text,
    exit_page text,
    total_pages_viewed integer DEFAULT 0,
    total_duration_seconds integer DEFAULT 0,
    is_bounce boolean DEFAULT false,
    traffic_source text CHECK (traffic_source IN ('direct', 'social', 'search', 'referral', 'email', 'other')),
    referrer_url text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. USER EVENTS & ACTIONS
-- ============================================================================

-- Events table (tracks all user actions)
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    event_name text NOT NULL,
    event_category text NOT NULL CHECK (event_category IN ('page_view', 'click', 'form', 'order', 'auth', 'search', 'error', 'custom')),
    event_label text,
    event_value numeric,
    metadata jsonb DEFAULT '{}'::jsonb,
    page_path text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. CONVERSION TRACKING
-- ============================================================================

-- Conversions table (tracks goal completions)
CREATE TABLE IF NOT EXISTS public.analytics_conversions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    conversion_type text NOT NULL CHECK (conversion_type IN ('signup', 'order_placed', 'order_completed', 'rider_signup', 'business_created')),
    conversion_value numeric DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. SYSTEM PERFORMANCE METRICS
-- ============================================================================

-- API performance table
CREATE TABLE IF NOT EXISTS public.analytics_api_performance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint text NOT NULL,
    method text NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    response_time_ms integer NOT NULL,
    status_code integer NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Error logs table
CREATE TABLE IF NOT EXISTS public.analytics_errors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES public.analytics_sessions(id) ON DELETE SET NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    error_type text NOT NULL,
    error_message text NOT NULL,
    error_stack text,
    page_path text,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. REAL-TIME ACTIVE USERS
-- ============================================================================

-- Active users table (for real-time tracking)
CREATE TABLE IF NOT EXISTS public.analytics_active_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id uuid REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
    last_seen timestamptz NOT NULL DEFAULT now(),
    current_page text,
    UNIQUE(user_id, session_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Page views indexes
CREATE INDEX IF NOT EXISTS idx_page_views_session ON public.analytics_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user ON public.analytics_page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON public.analytics_page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON public.analytics_page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_device ON public.analytics_page_views(device_type);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON public.analytics_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.analytics_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sessions_traffic_source ON public.analytics_sessions(traffic_source);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON public.analytics_sessions(device_type);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_session ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_user ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.analytics_events(event_category);

-- Conversions indexes
CREATE INDEX IF NOT EXISTS idx_conversions_user ON public.analytics_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversions_created ON public.analytics_conversions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_type ON public.analytics_conversions(conversion_type);

-- API performance indexes
CREATE INDEX IF NOT EXISTS idx_api_perf_endpoint ON public.analytics_api_performance(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_perf_created ON public.analytics_api_performance(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_perf_status ON public.analytics_api_performance(status_code);

-- Errors indexes
CREATE INDEX IF NOT EXISTS idx_errors_created ON public.analytics_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_type ON public.analytics_errors(error_type);

-- Active users indexes
CREATE INDEX IF NOT EXISTS idx_active_users_last_seen ON public.analytics_active_users(last_seen DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_api_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_active_users ENABLE ROW LEVEL SECURITY;

-- Admin can view all analytics
CREATE POLICY "Admins can view all page views"
ON public.analytics_page_views FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all sessions"
ON public.analytics_sessions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all events"
ON public.analytics_events FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all conversions"
ON public.analytics_conversions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all API performance"
ON public.analytics_api_performance FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all errors"
ON public.analytics_errors FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all active users"
ON public.analytics_active_users FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow service role to insert analytics data
CREATE POLICY "Service can insert page views"
ON public.analytics_page_views FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can insert sessions"
ON public.analytics_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can update sessions"
ON public.analytics_sessions FOR UPDATE
USING (true);

CREATE POLICY "Service can insert events"
ON public.analytics_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can insert conversions"
ON public.analytics_conversions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can insert API performance"
ON public.analytics_api_performance FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can insert errors"
ON public.analytics_errors FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can insert/update active users"
ON public.analytics_active_users FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to increment session duration
CREATE OR REPLACE FUNCTION public.increment_session_duration(p_session_id uuid, p_duration integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.analytics_sessions
  SET 
    total_duration_seconds = COALESCE(total_duration_seconds, 0) + p_duration,
    updated_at = now()
  WHERE id = p_session_id;
END;
$$;

-- Generic increment function for realtime fields
CREATE OR REPLACE FUNCTION public.increment(x integer DEFAULT 1)
RETURNS integer
LANGUAGE sql
AS $$
  SELECT x + 1;
$$;

-- Function to clean up old active users (inactive for >5 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.analytics_active_users
  WHERE last_seen < now() - interval '5 minutes';
END;
$$;

-- Function to end inactive sessions (inactive for >30 minutes)
CREATE OR REPLACE FUNCTION public.end_inactive_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.analytics_sessions
  SET 
    is_active = false,
    session_end = last_seen + interval '5 minutes'
  FROM (
    SELECT DISTINCT s.id, au.last_seen
    FROM public.analytics_sessions s
    LEFT JOIN public.analytics_active_users au ON s.id = au.session_id
    WHERE s.is_active = true
      AND (au.last_seen < now() - interval '30 minutes' OR au.last_seen IS NULL)
  ) inactive
  WHERE analytics_sessions.id = inactive.id;
END;
$$;

-- Function to calculate bounce rate
CREATE OR REPLACE FUNCTION public.calculate_bounce_rate(
  start_date timestamptz DEFAULT now() - interval '30 days',
  end_date timestamptz DEFAULT now()
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_sessions integer;
  bounced_sessions integer;
  bounce_rate numeric;
BEGIN
  SELECT COUNT(*) INTO total_sessions
  FROM public.analytics_sessions
  WHERE created_at BETWEEN start_date AND end_date;
  
  SELECT COUNT(*) INTO bounced_sessions
  FROM public.analytics_sessions
  WHERE created_at BETWEEN start_date AND end_date
    AND (total_pages_viewed <= 1 OR is_bounce = true);
  
  IF total_sessions = 0 THEN
    RETURN 0;
  END IF;
  
  bounce_rate := (bounced_sessions::numeric / total_sessions::numeric) * 100;
  RETURN ROUND(bounce_rate, 2);
END;
$$;

-- Function to get top pages
CREATE OR REPLACE FUNCTION public.get_top_pages(
  limit_count integer DEFAULT 10,
  start_date timestamptz DEFAULT now() - interval '30 days',
  end_date timestamptz DEFAULT now()
)
RETURNS TABLE (
  page_path text,
  view_count bigint,
  unique_visitors bigint,
  avg_duration numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.page_path,
    COUNT(*)::bigint as view_count,
    COUNT(DISTINCT pv.user_id)::bigint as unique_visitors,
    ROUND(AVG(pv.duration_seconds)::numeric, 2) as avg_duration
  FROM public.analytics_page_views pv
  WHERE pv.created_at BETWEEN start_date AND end_date
  GROUP BY pv.page_path
  ORDER BY view_count DESC
  LIMIT limit_count;
END;
$$;

-- Function to get traffic sources
CREATE OR REPLACE FUNCTION public.get_traffic_sources(
  start_date timestamptz DEFAULT now() - interval '30 days',
  end_date timestamptz DEFAULT now()
)
RETURNS TABLE (
  traffic_source text,
  session_count bigint,
  percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_sessions bigint;
BEGIN
  SELECT COUNT(*) INTO total_sessions
  FROM public.analytics_sessions
  WHERE created_at BETWEEN start_date AND end_date;
  
  RETURN QUERY
  SELECT 
    s.traffic_source,
    COUNT(*)::bigint as session_count,
    ROUND((COUNT(*)::numeric / NULLIF(total_sessions, 0)::numeric) * 100, 2) as percentage
  FROM public.analytics_sessions s
  WHERE s.created_at BETWEEN start_date AND end_date
  GROUP BY s.traffic_source
  ORDER BY session_count DESC;
END;
$$;

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================

-- Add tables to realtime publication for live updates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_active_users;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_sessions;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_events;
  END IF;
END $$;

-- Enable replica identity for realtime
ALTER TABLE public.analytics_active_users REPLICA IDENTITY FULL;
ALTER TABLE public.analytics_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.analytics_events REPLICA IDENTITY FULL;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.analytics_page_views IS 'Tracks every page view with detailed metadata';
COMMENT ON TABLE public.analytics_sessions IS 'Tracks user sessions with entry/exit pages and duration';
COMMENT ON TABLE public.analytics_events IS 'Tracks all user interactions and custom events';
COMMENT ON TABLE public.analytics_conversions IS 'Tracks goal completions and conversions';
COMMENT ON TABLE public.analytics_api_performance IS 'Tracks API endpoint performance metrics';
COMMENT ON TABLE public.analytics_errors IS 'Tracks application errors and exceptions';
COMMENT ON TABLE public.analytics_active_users IS 'Tracks currently active users in real-time';
