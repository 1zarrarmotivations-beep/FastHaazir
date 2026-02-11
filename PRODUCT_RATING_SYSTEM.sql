-- ============================================================================
-- PRODUCT RATING SYSTEM - Real Backend Implementation
-- Fast Haazir - Complete Menu Item Rating System
-- ============================================================================

-- ============================================================================
-- 1. PRODUCT RATING TABLE
-- ============================================================================

-- Individual Product/Menu Item Ratings
CREATE TABLE IF NOT EXISTS product_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- References
  order_id UUID REFERENCES orders(id) NOT NULL,
  customer_id UUID REFERENCES auth.users(id) NOT NULL,
  business_id UUID REFERENCES businesses(id) NOT NULL,
  product_name TEXT NOT NULL, -- Store product name for historical consistency
  product_category TEXT, -- food, grocery, etc.
  
  -- Rating Details
  rating NUMERIC(2,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
  review TEXT,
  tags TEXT[], -- ['fresh', 'tasty', 'good_portion', 'overcooked', 'cold', etc.]
  
  -- Additional Feedback
  would_order_again BOOLEAN DEFAULT TRUE,
  quality_rating NUMERIC(2,1) CHECK (quality_rating >= 1.0 AND quality_rating <= 5.0),
  value_rating NUMERIC(2,1) CHECK (value_rating >= 1.0 AND value_rating <= 5.0), -- worth the price?
  presentation_rating NUMERIC(2,1) CHECK (presentation_rating >= 1.0 AND presentation_rating <= 5.0),
  
  -- Images (optional)
  image_url TEXT,
  
  -- Metadata
  is_verified BOOLEAN DEFAULT FALSE, -- Verified purchased
  is_featured BOOLEAN DEFAULT FALSE, -- Admin can feature good reviews
  helpful_count INT DEFAULT 0, -- Other users can mark review as helpful
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate ratings for same product in same order
  UNIQUE(order_id, customer_id, product_name)
);

CREATE INDEX idx_product_ratings_product ON product_ratings(product_name, rating);
CREATE INDEX idx_product_ratings_business ON product_ratings(business_id, rating);
CREATE INDEX idx_product_ratings_customer ON product_ratings(customer_id, created_at DESC);
CREATE INDEX idx_product_ratings_order ON product_ratings(order_id);
CREATE INDEX idx_product_ratings_featured ON product_ratings(is_featured, rating DESC) WHERE is_featured = TRUE;

-- ============================================================================
-- 2. PRODUCT STATISTICS TABLE
-- ============================================================================

-- Aggregated Product Stats (Performance Optimization)
CREATE TABLE IF NOT EXISTS product_rating_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) NOT NULL,
  product_name TEXT NOT NULL,
  
  -- Rating Metrics
  average_rating NUMERIC(3,2) DEFAULT 0.00,
  total_ratings INT DEFAULT 0,
  
  -- Rating Distribution
  rating_5_count INT DEFAULT 0,
  rating_4_count INT DEFAULT 0,
  rating_3_count INT DEFAULT 0,
  rating_2_count INT DEFAULT 0,
  rating_1_count INT DEFAULT 0,
  
  -- Additional Metrics
  average_quality NUMERIC(3,2) DEFAULT 0.00,
  average_value NUMERIC(3,2) DEFAULT 0.00,
  average_presentation NUMERIC(3,2) DEFAULT 0.00,
  would_order_again_percentage NUMERIC(5,2) DEFAULT 0.00,
  
  -- Popularity
  total_orders INT DEFAULT 0, -- How many times ordered
  last_ordered_at TIMESTAMPTZ,
  
  -- Common Tags
  top_positive_tags TEXT[],
  top_negative_tags TEXT[],
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_id, product_name)
);

CREATE INDEX idx_product_stats_business ON product_rating_stats(business_id, average_rating DESC);
CREATE INDEX idx_product_stats_popular ON product_rating_stats(total_ratings DESC, average_rating DESC);

-- ============================================================================
-- 3. SUBMIT PRODUCT RATING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_product_rating(
  p_order_id UUID,
  p_customer_id UUID,
  p_product_name TEXT,
  p_rating NUMERIC,
  p_review TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_would_order_again BOOLEAN DEFAULT TRUE,
  p_quality_rating NUMERIC DEFAULT NULL,
  p_value_rating NUMERIC DEFAULT NULL,
  p_presentation_rating NUMERIC DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  order_rec RECORD;
  rating_id UUID;
  business_id_var UUID;
BEGIN
  -- 1. Validate order
  SELECT * INTO order_rec
  FROM orders
  WHERE id = p_order_id 
    AND customer_id = p_customer_id
    AND status = 'completed'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found, not yours, or not completed';
  END IF;

  business_id_var := order_rec.business_id;

  -- 2. Insert product rating
  INSERT INTO product_ratings (
    order_id, customer_id, business_id, product_name,
    rating, review, tags, would_order_again,
    quality_rating, value_rating, presentation_rating,
    image_url, is_verified
  ) VALUES (
    p_order_id, p_customer_id, business_id_var, p_product_name,
    p_rating, p_review, p_tags, p_would_order_again,
    p_quality_rating, p_value_rating, p_presentation_rating,
    p_image_url, TRUE
  )
  ON CONFLICT (order_id, customer_id, product_name) DO UPDATE
  SET 
    rating = EXCLUDED.rating,
    review = EXCLUDED.review,
    tags = EXCLUDED.tags,
    would_order_again = EXCLUDED.would_order_again,
    quality_rating = EXCLUDED.quality_rating,
    value_rating = EXCLUDED.value_rating,
    presentation_rating = EXCLUDED.presentation_rating,
    image_url = EXCLUDED.image_url,
    updated_at = NOW()
  RETURNING id INTO rating_id;

  -- 3. Update product stats
  INSERT INTO product_rating_stats (
    business_id, product_name, average_rating, total_ratings,
    average_quality, average_value, average_presentation,
    would_order_again_percentage
  ) VALUES (
    business_id_var, p_product_name, p_rating, 1,
    COALESCE(p_quality_rating, p_rating),
    COALESCE(p_value_rating, p_rating),
    COALESCE(p_presentation_rating, p_rating),
    CASE WHEN p_would_order_again THEN 100.00 ELSE 0.00 END
  )
  ON CONFLICT (business_id, product_name) DO UPDATE
  SET 
    total_ratings = product_rating_stats.total_ratings + 1,
    average_rating = (
      (product_rating_stats.average_rating * product_rating_stats.total_ratings + p_rating) 
      / (product_rating_stats.total_ratings + 1)
    ),
    average_quality = (
      (product_rating_stats.average_quality * product_rating_stats.total_ratings + COALESCE(p_quality_rating, p_rating)) 
      / (product_rating_stats.total_ratings + 1)
    ),
    average_value = (
      (product_rating_stats.average_value * product_rating_stats.total_ratings + COALESCE(p_value_rating, p_rating)) 
      / (product_rating_stats.total_ratings + 1)
    ),
    average_presentation = (
      (product_rating_stats.average_presentation * product_rating_stats.total_ratings + COALESCE(p_presentation_rating, p_rating)) 
      / (product_rating_stats.total_ratings + 1)
    ),
    would_order_again_percentage = (
      (product_rating_stats.would_order_again_percentage * product_rating_stats.total_ratings + 
       CASE WHEN p_would_order_again THEN 100.00 ELSE 0.00 END) 
      / (product_rating_stats.total_ratings + 1)
    ),
    rating_5_count = product_rating_stats.rating_5_count + (CASE WHEN p_rating >= 4.5 THEN 1 ELSE 0 END),
    rating_4_count = product_rating_stats.rating_4_count + (CASE WHEN p_rating >= 3.5 AND p_rating < 4.5 THEN 1 ELSE 0 END),
    rating_3_count = product_rating_stats.rating_3_count + (CASE WHEN p_rating >= 2.5 AND p_rating < 3.5 THEN 1 ELSE 0 END),
    rating_2_count = product_rating_stats.rating_2_count + (CASE WHEN p_rating >= 1.5 AND p_rating < 2.5 THEN 1 ELSE 0 END),
    rating_1_count = product_rating_stats.rating_1_count + (CASE WHEN p_rating < 1.5 THEN 1 ELSE 0 END),
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', TRUE,
    'rating_id', rating_id,
    'product_new_rating', (SELECT average_rating FROM product_rating_stats WHERE business_id = business_id_var AND product_name = p_product_name)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. GET PRODUCT RATING DETAILS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_product_rating_details(
  p_business_id UUID,
  p_product_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'business_id', p_business_id,
    'product_name', p_product_name,
    'average_rating', ROUND(COALESCE(ps.average_rating, 0), 2),
    'total_ratings', COALESCE(ps.total_ratings, 0),
    'rating_distribution', jsonb_build_object(
      '5_star', COALESCE(ps.rating_5_count, 0),
      '4_star', COALESCE(ps.rating_4_count, 0),
      '3_star', COALESCE(ps.rating_3_count, 0),
      '2_star', COALESCE(ps.rating_2_count, 0),
      '1_star', COALESCE(ps.rating_1_count, 0)
    ),
    'quality_metrics', jsonb_build_object(
      'quality', ROUND(COALESCE(ps.average_quality, 0), 2),
      'value', ROUND(COALESCE(ps.average_value, 0), 2),
      'presentation', ROUND(COALESCE(ps.average_presentation, 0), 2),
      'would_order_again_pct', ROUND(COALESCE(ps.would_order_again_percentage, 0), 1)
    ),
    'top_positive_tags', COALESCE(ps.top_positive_tags, ARRAY[]::TEXT[]),
    'top_negative_tags', COALESCE(ps.top_negative_tags, ARRAY[]::TEXT[]),
    'recent_reviews', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'rating', rating,
          'review', review,
          'tags', tags,
          'would_order_again', would_order_again,
          'image_url', image_url,
          'helpful_count', helpful_count,
          'created_at', created_at
        ) ORDER BY created_at DESC
      )
      FROM product_ratings
      WHERE business_id = p_business_id 
        AND product_name = p_product_name 
        AND review IS NOT NULL
      LIMIT 10
    )
  ) INTO result
  FROM product_rating_stats ps
  WHERE ps.business_id = p_business_id AND ps.product_name = p_product_name;

  RETURN COALESCE(result, jsonb_build_object('product_name', p_product_name, 'total_ratings', 0));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. GET TOP RATED PRODUCTS (BY RESTAURANT)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_top_products_by_restaurant(
  p_business_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  product_name TEXT,
  average_rating NUMERIC,
  total_ratings INT,
  would_order_again_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.product_name,
    ROUND(ps.average_rating, 2),
    ps.total_ratings,
    ROUND(ps.would_order_again_percentage, 1)
  FROM product_rating_stats ps
  WHERE ps.business_id = p_business_id AND ps.total_ratings > 0
  ORDER BY ps.average_rating DESC, ps.total_ratings DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. GET TOP RATED PRODUCTS (GLOBAL)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_top_products_global(p_limit INT DEFAULT 20)
RETURNS TABLE(
  business_id UUID,
  business_name TEXT,
  product_name TEXT,
  average_rating NUMERIC,
  total_ratings INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.business_id,
    b.name,
    ps.product_name,
    ROUND(ps.average_rating, 2),
    ps.total_ratings
  FROM product_rating_stats ps
  JOIN businesses b ON b.id = ps.business_id
  WHERE ps.total_ratings >= 5 -- Minimum 5 ratings to qualify
  ORDER BY ps.average_rating DESC, ps.total_ratings DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. MARK REVIEW AS HELPFUL
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_review_helpful(p_rating_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE product_ratings
  SET helpful_count = helpful_count + 1
  WHERE id = p_rating_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. GET CUSTOMER'S PRODUCT RATINGS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_customer_product_ratings(p_customer_id UUID)
RETURNS TABLE(
  product_name TEXT,
  business_name TEXT,
  rating NUMERIC,
  review TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.product_name,
    b.name,
    pr.rating,
    pr.review,
    pr.created_at
  FROM product_ratings pr
  JOIN businesses b ON b.id = pr.business_id
  WHERE pr.customer_id = p_customer_id
  ORDER BY pr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE product_ratings ENABLE ROW LEVEL SECURITY;

-- Customers can view all product ratings (public)
CREATE POLICY "Anyone can view product ratings" ON product_ratings
  FOR SELECT USING (TRUE);

-- Customers can only submit ratings for their own orders
CREATE POLICY "Customers submit own product ratings" ON product_ratings
  FOR INSERT WITH CHECK (
    customer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders 
      WHERE id = order_id 
        AND customer_id = auth.uid() 
        AND status = 'completed'
    )
  );

-- Customers can update their own ratings
CREATE POLICY "Customers update own ratings" ON product_ratings
  FOR UPDATE USING (customer_id = auth.uid());

-- Admins can manage all
CREATE POLICY "Admins manage product ratings" ON product_ratings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 10. EXAMPLE USAGE
-- ============================================================================

/*
-- Submit product rating
SELECT submit_product_rating(
  p_order_id := 'order-uuid',
  p_customer_id := auth.uid(),
  p_product_name := 'Chicken Sajji Full',
  p_rating := 5.0,
  p_review := 'Best Sajji I ever had! Perfectly cooked and very flavorful.',
  p_tags := ARRAY['fresh', 'tasty', 'good_portion', 'well_cooked'],
  p_would_order_again := TRUE,
  p_quality_rating := 5.0,
  p_value_rating := 4.5,
  p_presentation_rating := 5.0
);

-- Get product details
SELECT get_product_rating_details('business-uuid', 'Chicken Sajji Full');

-- Get top products from a restaurant
SELECT * FROM get_top_products_by_restaurant('business-uuid', 5);

-- Get globally top-rated products
SELECT * FROM get_top_products_global(20);

-- Mark review as helpful
SELECT mark_review_helpful('rating-uuid');
*/

-- ============================================================================
-- DEPLOYMENT COMPLETE ✅
-- ============================================================================
