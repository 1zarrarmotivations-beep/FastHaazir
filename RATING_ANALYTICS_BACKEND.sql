-- ============================================================================
-- ADMIN ANALYTICS - RATING TRENDS & ALERTS
-- Fast Haazir - Complete Analytics Backend
-- ============================================================================

-- ============================================================================
-- 1. RATING TRENDS OVER TIME
-- ============================================================================

-- Get daily rating trends (last 30 days)
CREATE OR REPLACE FUNCTION get_rating_trends_daily(p_days INT DEFAULT 30)
RETURNS TABLE(
  date DATE,
  avg_rider_rating NUMERIC,
  avg_restaurant_rating NUMERIC,
  avg_product_rating NUMERIC,
  total_ratings INT,
  total_orders_rated INT
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      DATE(or_ratings.created_at) as rating_date,
      AVG(or_ratings.rider_rating) as rider_avg,
      AVG(or_ratings.restaurant_rating) as restaurant_avg,
      COUNT(*) as ratings_count,
      COUNT(DISTINCT or_ratings.order_id) as orders_count
    FROM order_ratings or_ratings
    WHERE or_ratings.created_at >= CURRENT_DATE - p_days
    GROUP BY DATE(or_ratings.created_at)
  ),
  product_stats AS (
    SELECT 
      DATE(pr.created_at) as rating_date,
      AVG(pr.rating) as product_avg
    FROM product_ratings pr
    WHERE pr.created_at >= CURRENT_DATE - p_days
    GROUP BY DATE(pr.created_at)
  )
  SELECT 
    ds.rating_date::DATE,
    ROUND(COALESCE(ds.rider_avg, 0), 2)::NUMERIC,
    ROUND(COALESCE(ds.restaurant_avg, 0), 2)::NUMERIC,
    ROUND(COALESCE(ps.product_avg, 0), 2)::NUMERIC,
    COALESCE(ds.ratings_count, 0)::INT,
    COALESCE(ds.orders_count, 0)::INT
  FROM daily_stats ds
  FULL OUTER JOIN product_stats ps ON ds.rating_date = ps.rating_date
  ORDER BY rating_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. LOW-RATED ENTITIES ALERT SYSTEM
-- ============================================================================

-- Get low-rated riders (needs attention)
CREATE OR REPLACE FUNCTION get_low_rated_riders(
  p_min_ratings INT DEFAULT 5,
  p_threshold NUMERIC DEFAULT 3.5
)
RETURNS TABLE(
  rider_id UUID,
  rider_name TEXT,
  rider_phone TEXT,
  average_rating NUMERIC,
  total_ratings INT,
  recent_poor_ratings INT,
  last_poor_rating_date TIMESTAMPTZ,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.phone,
    ROUND(r.rating, 2),
    r.total_ratings,
    (
      SELECT COUNT(*)::INT
      FROM order_ratings orr
      WHERE orr.rider_id = r.id 
        AND orr.rider_rating < 3.0
        AND orr.created_at > NOW() - INTERVAL '7 days'
    ),
    (
      SELECT MAX(orr.created_at)
      FROM order_ratings orr
      WHERE orr.rider_id = r.id AND orr.rider_rating < 3.0
    ),
    CASE 
      WHEN r.rating < 2.5 THEN 'CRITICAL'
      WHEN r.rating < 3.0 THEN 'WARNING'
      ELSE 'NEEDS_ATTENTION'
    END
  FROM riders r
  WHERE r.total_ratings >= p_min_ratings
    AND r.rating < p_threshold
  ORDER BY r.rating ASC, r.total_ratings DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get low-rated restaurants
CREATE OR REPLACE FUNCTION get_low_rated_restaurants(
  p_min_ratings INT DEFAULT 5,
  p_threshold NUMERIC DEFAULT 3.5
)
RETURNS TABLE(
  business_id UUID,
  business_name TEXT,
  category TEXT,
  average_rating NUMERIC,
  total_ratings INT,
  recent_poor_ratings INT,
  last_poor_rating_date TIMESTAMPTZ,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.category,
    ROUND(b.rating, 2),
    b.total_ratings,
    (
      SELECT COUNT(*)::INT
      FROM order_ratings orr
      WHERE orr.business_id = b.id 
        AND orr.restaurant_rating < 3.0
        AND orr.created_at > NOW() - INTERVAL '7 days'
    ),
    (
      SELECT MAX(orr.created_at)
      FROM order_ratings orr
      WHERE orr.business_id = b.id AND orr.restaurant_rating < 3.0
    ),
    CASE 
      WHEN b.rating < 2.5 THEN 'CRITICAL'
      WHEN b.rating < 3.0 THEN 'WARNING'
      ELSE 'NEEDS_ATTENTION'
    END
  FROM businesses b
  WHERE b.total_ratings >= p_min_ratings
    AND b.rating < p_threshold
  ORDER BY b.rating ASC, b.total_ratings DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get low-rated products
CREATE OR REPLACE FUNCTION get_low_rated_products(
  p_min_ratings INT DEFAULT 3,
  p_threshold NUMERIC DEFAULT 3.5
)
RETURNS TABLE(
  business_id UUID,
  business_name TEXT,
  product_name TEXT,
  average_rating NUMERIC,
  total_ratings INT,
  would_order_again_pct NUMERIC,
  top_negative_tags TEXT[],
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.business_id,
    b.name,
    ps.product_name,
    ROUND(ps.average_rating, 2),
    ps.total_ratings,
    ROUND(ps.would_order_again_percentage, 1),
    ps.top_negative_tags,
    CASE 
      WHEN ps.average_rating < 2.5 THEN 'CRITICAL'
      WHEN ps.average_rating < 3.0 THEN 'WARNING'
      ELSE 'NEEDS_ATTENTION'
    END
  FROM product_rating_stats ps
  JOIN businesses b ON b.id = ps.business_id
  WHERE ps.total_ratings >= p_min_ratings
    AND ps.average_rating < p_threshold
  ORDER BY ps.average_rating ASC, ps.total_ratings DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. REVIEW MODERATION
-- ============================================================================

-- Get flagged/reported reviews (for moderation)
CREATE OR REPLACE FUNCTION get_reviews_for_moderation()
RETURNS TABLE(
  review_id UUID,
  review_type TEXT,
  reviewer_id UUID,
  order_id UUID,
  rating NUMERIC,
  review_text TEXT,
  entity_name TEXT,
  created_at TIMESTAMPTZ,
  helpful_count INT,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Rider reviews
  SELECT 
    orr.id,
    'rider'::TEXT,
    orr.customer_id,
    orr.order_id,
    orr.rider_rating,
    orr.rider_review,
    r.name,
    orr.created_at,
    0,
    CASE 
      WHEN orr.rider_rating <= 1.5 THEN 'Very Low Rating'
      WHEN orr.rider_review LIKE '%scam%' OR orr.rider_review LIKE '%thief%' THEN 'Potentially Abusive'
      WHEN LENGTH(orr.rider_review) > 500 THEN 'Excessive Length'
      ELSE 'Manual Review'
    END
  FROM order_ratings orr
  JOIN riders r ON r.id = orr.rider_id
  WHERE orr.rider_rating IS NOT NULL
    AND (
      orr.rider_rating <= 1.5 OR
      orr.rider_review ILIKE '%scam%' OR
      orr.rider_review ILIKE '%thief%' OR
      orr.rider_review ILIKE '%worst%' OR
      LENGTH(orr.rider_review) > 500
    )
    AND orr.created_at > NOW() - INTERVAL '30 days'
  
  UNION ALL
  
  -- Restaurant reviews
  SELECT 
    orr.id,
    'restaurant'::TEXT,
    orr.customer_id,
    orr.order_id,
    orr.restaurant_rating,
    orr.restaurant_review,
    b.name,
    orr.created_at,
    0,
    CASE 
      WHEN orr.restaurant_rating <= 1.5 THEN 'Very Low Rating'
      WHEN orr.restaurant_review ILIKE '%poison%' OR orr.restaurant_review ILIKE '%sick%' THEN 'Health Concern'
      ELSE 'Manual Review'
    END
  FROM order_ratings orr
  JOIN businesses b ON b.id = orr.business_id
  WHERE orr.restaurant_rating IS NOT NULL
    AND (
      orr.restaurant_rating <= 1.5 OR
      orr.restaurant_review ILIKE '%poison%' OR
      orr.restaurant_review ILIKE '%sick%' OR
      orr.restaurant_review ILIKE '%food poisoning%'
    )
    AND orr.created_at > NOW() - INTERVAL '30 days'
  
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. RATING ANALYTICS DASHBOARD
-- ============================================================================

-- Get comprehensive rating statistics
CREATE OR REPLACE FUNCTION get_rating_dashboard_stats()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'riders', jsonb_build_object(
      'average_rating', (SELECT ROUND(AVG(rating), 2) FROM riders WHERE total_ratings > 0),
      'total_rated', (SELECT COUNT(*) FROM riders WHERE total_ratings > 0),
      'excellent_count', (SELECT COUNT(*) FROM riders WHERE rating >= 4.5 AND total_ratings >= 5),
      'poor_count', (SELECT COUNT(*) FROM riders WHERE rating < 3.5 AND total_ratings >= 5)
    ),
    'restaurants', jsonb_build_object(
      'average_rating', (SELECT ROUND(AVG(rating), 2) FROM businesses WHERE total_ratings > 0),
      'total_rated', (SELECT COUNT(*) FROM businesses WHERE total_ratings > 0),
      'excellent_count', (SELECT COUNT(*) FROM businesses WHERE rating >= 4.5 AND total_ratings >= 5),
      'poor_count', (SELECT COUNT(*) FROM businesses WHERE rating < 3.5 AND total_ratings >= 5)
    ),
    'products', jsonb_build_object(
      'average_rating', (SELECT ROUND(AVG(average_rating), 2) FROM product_rating_stats WHERE total_ratings > 0),
      'total_rated', (SELECT COUNT(*) FROM product_rating_stats WHERE total_ratings > 0),
      'excellent_count', (SELECT COUNT(*) FROM product_rating_stats WHERE average_rating >= 4.5 AND total_ratings >= 3),
      'poor_count', (SELECT COUNT(*) FROM product_rating_stats WHERE average_rating < 3.5 AND total_ratings >= 3)
    ),
    'recent_activity', jsonb_build_object(
      'total_reviews_today', (SELECT COUNT(*) FROM order_ratings WHERE DATE(created_at) = CURRENT_DATE),
      'total_reviews_week', (SELECT COUNT(*) FROM order_ratings WHERE created_at > NOW() - INTERVAL '7 days'),
      'avg_rating_today', (
        SELECT ROUND(AVG((COALESCE(rider_rating, 0) + COALESCE(restaurant_rating, 0)) / 2), 2)
        FROM order_ratings 
        WHERE DATE(created_at) = CURRENT_DATE
      )
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. RATING DISTRIBUTION BREAKDOWN
-- ============================================================================

CREATE OR REPLACE FUNCTION get_rating_distribution(
  p_entity_type TEXT DEFAULT 'all' -- 'riders', 'restaurants', 'products', 'all'
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF p_entity_type = 'riders' OR p_entity_type = 'all' THEN
    result := jsonb_build_object(
      'riders', (
        SELECT jsonb_build_object(
          '5_star', COUNT(*) FILTER (WHERE rating >= 4.5),
          '4_star', COUNT(*) FILTER (WHERE rating >= 3.5 AND rating < 4.5),
          '3_star', COUNT(*) FILTER (WHERE rating >= 2.5 AND rating < 3.5),
          '2_star', COUNT(*) FILTER (WHERE rating >= 1.5 AND rating < 2.5),
          '1_star', COUNT(*) FILTER (WHERE rating < 1.5)
        )
        FROM riders WHERE total_ratings >= 5
      )
    );
  END IF;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. TOP PERFORMERS (FOR RECOGNITION)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_top_performers_this_month()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'riders', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'name', r.name,
          'rating', ROUND(r.rating, 2),
          'total_ratings', r.total_ratings,
          'total_orders', (SELECT COUNT(*) FROM orders WHERE rider_id = r.id AND status = 'completed')
        )
        ORDER BY r.rating DESC, r.total_ratings DESC
      )
      FROM riders r
      WHERE r.total_ratings >= 20
      LIMIT 10
    ),
    'restaurants', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'name', b.name,
          'rating', ROUND(b.rating, 2),
          'total_ratings', b.total_ratings
        )
        ORDER BY b.rating DESC, b.total_ratings DESC
      )
      FROM businesses b
      WHERE b.total_ratings >= 10
      LIMIT 10
    ),
    'products', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'business_name', b.name,
          'product_name', ps.product_name,
          'rating', ROUND(ps.average_rating, 2),
          'total_ratings', ps.total_ratings
        )
        ORDER BY ps.average_rating DESC, ps.total_ratings DESC
      )
      FROM product_rating_stats ps
      JOIN businesses b ON b.id = ps.business_id
      WHERE ps.total_ratings >= 10
      LIMIT 10
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. ALERT TRIGGERS (Auto-Create Notifications)
-- ============================================================================

-- Function to create alerts for low ratings
CREATE OR REPLACE FUNCTION check_and_create_rating_alerts()
RETURNS VOID AS $$
BEGIN
  -- Alert for riders with recent poor performance
  INSERT INTO anomaly_alerts (alert_type, severity, entity_type, entity_id, message, metadata)
  SELECT 
    'low_rider_rating',
    CASE WHEN r.rating < 2.5 THEN 'critical' ELSE 'warning' END,
    'rider',
    r.id,
    'Rider ' || r.name || ' has low rating: ' || ROUND(r.rating, 2)::TEXT,
    jsonb_build_object('rating', r.rating, 'total_ratings', r.total_ratings)
  FROM riders r
  WHERE r.rating < 3.5 
    AND r.total_ratings >= 5
    AND NOT EXISTS (
      SELECT 1 FROM anomaly_alerts aa 
      WHERE aa.entity_id = r.id 
        AND aa.alert_type = 'low_rider_rating'
        AND aa.created_at > NOW() - INTERVAL '7 days'
    );

  -- Alert for restaurants
  INSERT INTO anomaly_alerts (alert_type, severity, entity_type, entity_id, message, metadata)
  SELECT 
    'low_restaurant_rating',
    CASE WHEN b.rating < 2.5 THEN 'critical' ELSE 'warning' END,
    'business',
    b.id,
    'Restaurant ' || b.name || ' has low rating: ' || ROUND(b.rating, 2)::TEXT,
    jsonb_build_object('rating', b.rating, 'total_ratings', b.total_ratings)
  FROM businesses b
  WHERE b.rating < 3.5 
    AND b.total_ratings >= 5
    AND NOT EXISTS (
      SELECT 1 FROM anomaly_alerts aa 
      WHERE aa.entity_id = b.id 
        AND aa.alert_type = 'low_restaurant_rating'
        AND aa.created_at > NOW() - INTERVAL '7 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DEPLOYMENT COMPLETE ✅
-- ============================================================================

-- Run this function daily via cron job:
-- SELECT check_and_create_rating_alerts();
