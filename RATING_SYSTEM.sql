-- ============================================================================
-- ADVANCED RATING SYSTEM - Real Backend Implementation
-- Fast Haazir - Production Grade
-- ============================================================================

-- ============================================================================
-- 1. RATING TABLES
-- ============================================================================

-- Order Ratings (Customer rates Rider + Restaurant after delivery)
CREATE TABLE IF NOT EXISTS order_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) NOT NULL,
  customer_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Rider Rating
  rider_id UUID REFERENCES riders(id),
  rider_rating NUMERIC(2,1) CHECK (rider_rating >= 1.0 AND rider_rating <= 5.0),
  rider_review TEXT,
  rider_tags TEXT[], -- ['on_time', 'polite', 'careful_handling']
  
  -- Restaurant/Business Rating
  business_id UUID REFERENCES businesses(id),
  restaurant_rating NUMERIC(2,1) CHECK (restaurant_rating >= 1.0 AND restaurant_rating <= 5.0),
  restaurant_review TEXT,
  restaurant_tags TEXT[], -- ['food_quality', 'packaging', 'portion_size']
  
  -- Metadata
  is_verified BOOLEAN DEFAULT FALSE, -- Verified that order was actually completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate ratings
  UNIQUE(order_id, customer_id)
);

CREATE INDEX idx_ratings_rider ON order_ratings(rider_id, rider_rating);
CREATE INDEX idx_ratings_restaurant ON order_ratings(business_id, restaurant_rating);
CREATE INDEX idx_ratings_customer ON order_ratings(customer_id, created_at DESC);
CREATE INDEX idx_ratings_order ON order_ratings(order_id);

-- Rider Statistics (Aggregated for Performance)
CREATE TABLE IF NOT EXISTS rider_rating_stats (
  rider_id UUID PRIMARY KEY REFERENCES riders(id),
  
  -- Rating Metrics
  average_rating NUMERIC(3,2) DEFAULT 0.00,
  total_ratings INT DEFAULT 0,
  
  -- Rating Distribution
  rating_5_count INT DEFAULT 0,
  rating_4_count INT DEFAULT 0,
  rating_3_count INT DEFAULT 0,
  rating_2_count INT DEFAULT 0,
  rating_1_count INT DEFAULT 0,
  
  -- Common Tags
  top_positive_tags TEXT[],
  top_negative_tags TEXT[],
  
  -- Performance
  on_time_percentage NUMERIC(5,2) DEFAULT 100.00,
  acceptance_rate NUMERIC(5,2) DEFAULT 100.00,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business/Restaurant Statistics
CREATE TABLE IF NOT EXISTS business_rating_stats (
  business_id UUID PRIMARY KEY REFERENCES businesses(id),
  
  -- Rating Metrics
  average_rating NUMERIC(3,2) DEFAULT 0.00,
  total_ratings INT DEFAULT 0,
  
  -- Rating Distribution
  rating_5_count INT DEFAULT 0,
  rating_4_count INT DEFAULT 0,
  rating_3_count INT DEFAULT 0,
  rating_2_count INT DEFAULT 0,
  rating_1_count INT DEFAULT 0,
  
  -- Common Tags
  top_positive_tags TEXT[],
  top_negative_tags TEXT[],
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. ENHANCE EXISTING TABLES
-- ============================================================================

-- Add rating column to riders table (if not exists)
ALTER TABLE riders ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0.00;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0;

-- Add rating column to businesses table (if not exists)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0.00;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0;

-- Add rating status to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_rated BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_rating_status ON orders(is_rated, status);

-- ============================================================================
-- 3. SUBMIT RATING FUNCTION (Atomic + Auto-Update Stats)
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_order_rating(
  p_order_id UUID,
  p_customer_id UUID,
  p_rider_rating NUMERIC DEFAULT NULL,
  p_rider_review TEXT DEFAULT NULL,
  p_rider_tags TEXT[] DEFAULT NULL,
  p_restaurant_rating NUMERIC DEFAULT NULL,
  p_restaurant_review TEXT DEFAULT NULL,
  p_restaurant_tags TEXT[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  order_rec RECORD;
  rating_id UUID;
BEGIN
  -- 1. Validate order exists and belongs to customer
  SELECT * INTO order_rec
  FROM orders
  WHERE id = p_order_id 
    AND customer_id = p_customer_id
    AND status = 'completed'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found, not yours, or not completed';
  END IF;

  IF order_rec.is_rated THEN
    RAISE EXCEPTION 'Order already rated';
  END IF;

  -- 2. Insert rating
  INSERT INTO order_ratings (
    order_id, customer_id, rider_id, business_id,
    rider_rating, rider_review, rider_tags,
    restaurant_rating, restaurant_review, restaurant_tags,
    is_verified
  ) VALUES (
    p_order_id, p_customer_id, order_rec.rider_id, order_rec.business_id,
    p_rider_rating, p_rider_review, p_rider_tags,
    p_restaurant_rating, p_restaurant_review, p_restaurant_tags,
    TRUE
  )
  RETURNING id INTO rating_id;

  -- 3. Update rider stats (if rider was rated)
  IF p_rider_rating IS NOT NULL AND order_rec.rider_id IS NOT NULL THEN
    -- Insert or update rider stats
    INSERT INTO rider_rating_stats (rider_id, average_rating, total_ratings)
    VALUES (order_rec.rider_id, p_rider_rating, 1)
    ON CONFLICT (rider_id) DO UPDATE
    SET 
      total_ratings = rider_rating_stats.total_ratings + 1,
      average_rating = (
        (rider_rating_stats.average_rating * rider_rating_stats.total_ratings + p_rider_rating) 
        / (rider_rating_stats.total_ratings + 1)
      ),
      rating_5_count = rider_rating_stats.rating_5_count + (CASE WHEN p_rider_rating >= 4.5 THEN 1 ELSE 0 END),
      rating_4_count = rider_rating_stats.rating_4_count + (CASE WHEN p_rider_rating >= 3.5 AND p_rider_rating < 4.5 THEN 1 ELSE 0 END),
      rating_3_count = rider_rating_stats.rating_3_count + (CASE WHEN p_rider_rating >= 2.5 AND p_rider_rating < 3.5 THEN 1 ELSE 0 END),
      rating_2_count = rider_rating_stats.rating_2_count + (CASE WHEN p_rider_rating >= 1.5 AND p_rider_rating < 2.5 THEN 1 ELSE 0 END),
      rating_1_count = rider_rating_stats.rating_1_count + (CASE WHEN p_rider_rating < 1.5 THEN 1 ELSE 0 END),
      updated_at = NOW();

    -- Update rider table
    UPDATE riders
    SET 
      rating = (SELECT average_rating FROM rider_rating_stats WHERE rider_id = order_rec.rider_id),
      total_ratings = (SELECT total_ratings FROM rider_rating_stats WHERE rider_id = order_rec.rider_id),
      updated_at = NOW()
    WHERE id = order_rec.rider_id;
  END IF;

  -- 4. Update restaurant stats (if restaurant was rated)
  IF p_restaurant_rating IS NOT NULL AND order_rec.business_id IS NOT NULL THEN
    INSERT INTO business_rating_stats (business_id, average_rating, total_ratings)
    VALUES (order_rec.business_id, p_restaurant_rating, 1)
    ON CONFLICT (business_id) DO UPDATE
    SET 
      total_ratings = business_rating_stats.total_ratings + 1,
      average_rating = (
        (business_rating_stats.average_rating * business_rating_stats.total_ratings + p_restaurant_rating) 
        / (business_rating_stats.total_ratings + 1)
      ),
      rating_5_count = business_rating_stats.rating_5_count + (CASE WHEN p_restaurant_rating >= 4.5 THEN 1 ELSE 0 END),
      rating_4_count = business_rating_stats.rating_4_count + (CASE WHEN p_restaurant_rating >= 3.5 AND p_restaurant_rating < 4.5 THEN 1 ELSE 0 END),
      rating_3_count = business_rating_stats.rating_3_count + (CASE WHEN p_restaurant_rating >= 2.5 AND p_restaurant_rating < 3.5 THEN 1 ELSE 0 END),
      rating_2_count = business_rating_stats.rating_2_count + (CASE WHEN p_restaurant_rating >= 1.5 AND p_restaurant_rating < 2.5 THEN 1 ELSE 0 END),
      rating_1_count = business_rating_stats.rating_1_count + (CASE WHEN p_restaurant_rating < 1.5 THEN 1 ELSE 0 END),
      updated_at = NOW();

    -- Update business table
    UPDATE businesses
    SET 
      rating = (SELECT average_rating FROM business_rating_stats WHERE business_id = order_rec.business_id),
      total_ratings = (SELECT total_ratings FROM business_rating_stats WHERE business_id = order_rec.business_id),
      updated_at = NOW()
    WHERE id = order_rec.business_id;
  END IF;

  -- 5. Mark order as rated
  UPDATE orders
  SET is_rated = TRUE, rated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'rating_id', rating_id,
    'rider_new_rating', (SELECT rating FROM riders WHERE id = order_rec.rider_id),
    'restaurant_new_rating', (SELECT rating FROM businesses WHERE id = order_rec.business_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. GET RIDER RATING DETAILS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_rider_rating_details(p_rider_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'rider_id', r.id,
    'name', r.name,
    'phone', r.phone,
    'average_rating', ROUND(COALESCE(r.rating, 0), 2),
    'total_ratings', COALESCE(r.total_ratings, 0),
    'rating_distribution', jsonb_build_object(
      '5_star', COALESCE(rs.rating_5_count, 0),
      '4_star', COALESCE(rs.rating_4_count, 0),
      '3_star', COALESCE(rs.rating_3_count, 0),
      '2_star', COALESCE(rs.rating_2_count, 0),
      '1_star', COALESCE(rs.rating_1_count, 0)
    ),
    'top_positive_tags', COALESCE(rs.top_positive_tags, ARRAY[]::TEXT[]),
    'recent_reviews', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'rating', rider_rating,
          'review', rider_review,
          'tags', rider_tags,
          'created_at', created_at
        ) ORDER BY created_at DESC
      )
      FROM order_ratings
      WHERE rider_id = p_rider_id AND rider_review IS NOT NULL
      LIMIT 5
    )
  ) INTO result
  FROM riders r
  LEFT JOIN rider_rating_stats rs ON rs.rider_id = r.id
  WHERE r.id = p_rider_id;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. GET RESTAURANT RATING DETAILS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_restaurant_rating_details(p_business_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'business_id', b.id,
    'name', b.name,
    'average_rating', ROUND(COALESCE(b.rating, 0), 2),
    'total_ratings', COALESCE(b.total_ratings, 0),
    'rating_distribution', jsonb_build_object(
      '5_star', COALESCE(bs.rating_5_count, 0),
      '4_star', COALESCE(bs.rating_4_count, 0),
      '3_star', COALESCE(bs.rating_3_count, 0),
      '2_star', COALESCE(bs.rating_2_count, 0),
      '1_star', COALESCE(bs.rating_1_count, 0)
    ),
    'top_positive_tags', COALESCE(bs.top_positive_tags, ARRAY[]::TEXT[]),
    'recent_reviews', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'rating', restaurant_rating,
          'review', restaurant_review,
          'tags', restaurant_tags,
          'created_at', created_at
        ) ORDER BY created_at DESC
      )
      FROM order_ratings
      WHERE business_id = p_business_id AND restaurant_review IS NOT NULL
      LIMIT 10
    )
  ) INTO result
  FROM businesses b
  LEFT JOIN business_rating_stats bs ON bs.business_id = b.id
  WHERE b.id = p_business_id;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. GET TOP RATED RIDERS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_top_rated_riders(p_limit INT DEFAULT 10)
RETURNS TABLE(
  rider_id UUID,
  name TEXT,
  phone TEXT,
  rating NUMERIC,
  total_ratings INT,
  total_orders INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.phone,
    ROUND(COALESCE(r.rating, 0), 2),
    COALESCE(r.total_ratings, 0),
    (SELECT COUNT(*) FROM orders WHERE rider_id = r.id AND status = 'completed')::INT
  FROM riders r
  WHERE r.is_active = TRUE AND r.total_ratings > 0
  ORDER BY r.rating DESC, r.total_ratings DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. GET TOP RATED RESTAURANTS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_top_rated_restaurants(p_limit INT DEFAULT 10)
RETURNS TABLE(
  business_id UUID,
  name TEXT,
  category TEXT,
  rating NUMERIC,
  total_ratings INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.category,
    ROUND(COALESCE(b.rating, 0), 2),
    COALESCE(b.total_ratings, 0)
  FROM businesses b
  WHERE b.is_active = TRUE AND b.total_ratings > 0
  ORDER BY b.rating DESC, b.total_ratings DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE order_ratings ENABLE ROW LEVEL SECURITY;

-- Customers can view their own ratings
CREATE POLICY "Customers view own ratings" ON order_ratings
  FOR SELECT USING (customer_id = auth.uid());

-- Customers can insert ratings for their completed orders
CREATE POLICY "Customers submit ratings" ON order_ratings
  FOR INSERT WITH CHECK (
    customer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders 
      WHERE id = order_id 
        AND customer_id = auth.uid() 
        AND status = 'completed'
        AND is_rated = FALSE
    )
  );

-- Riders can view ratings about themselves
CREATE POLICY "Riders view own ratings" ON order_ratings
  FOR SELECT USING (
    rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid())
  );

-- Admins can view all
CREATE POLICY "Admins view all ratings" ON order_ratings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 9. EXAMPLE USAGE
-- ============================================================================

-- Submit a rating (customer rates rider + restaurant after order completion)
/*
SELECT submit_order_rating(
  p_order_id := '123e4567-e89b-12d3-a456-426614174000',
  p_customer_id := auth.uid(),
  p_rider_rating := 4.5,
  p_rider_review := 'Very polite and on time!',
  p_rider_tags := ARRAY['on_time', 'polite', 'careful_handling'],
  p_restaurant_rating := 5.0,
  p_restaurant_review := 'Amazing food quality and packaging!',
  p_restaurant_tags := ARRAY['food_quality', 'packaging', 'fast_service']
);
*/

-- Get rider details with ratings
-- SELECT get_rider_rating_details('rider-uuid-here');

-- Get restaurant details with ratings
-- SELECT get_restaurant_rating_details('restaurant-uuid-here');

-- Get top 10 riders
-- SELECT * FROM get_top_rated_riders(10);

-- Get top 10 restaurants
-- SELECT * FROM get_top_rated_restaurants(10);

-- ============================================================================
-- DEPLOYMENT COMPLETE ✅
-- ============================================================================
