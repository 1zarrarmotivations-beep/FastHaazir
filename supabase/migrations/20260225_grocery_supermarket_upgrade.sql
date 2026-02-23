-- ============================================================================
-- FAST HAAZIR - GROCERY SUPERMARKET UPGRADE
-- Database Enhancements for Professional Digital Supermarket
-- ============================================================================

-- 1. PRODUCT RATINGS & REVIEWS
-- ============================================================================

-- Reviews table
CREATE TABLE IF NOT EXISTS public.grocery_product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.grocery_products(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.grocery_orders(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT true,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Review images (for proof)
CREATE TABLE IF NOT EXISTS public.grocery_review_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID REFERENCES public.grocery_product_reviews(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Product rating summary (cached for performance)
CREATE TABLE IF NOT EXISTS public.grocery_product_rating_summary (
    product_id UUID PRIMARY KEY REFERENCES public.grocery_products(id) ON DELETE CASCADE,
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    five_star_count INTEGER DEFAULT 0,
    four_star_count INTEGER DEFAULT 0,
    three_star_count INTEGER DEFAULT 0,
    two_star_count INTEGER DEFAULT 0,
    one_star_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ORDER TRACKING & TIMELINE
-- ============================================================================

-- Order status timeline
CREATE TABLE IF NOT EXISTS public.grocery_order_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.grocery_orders(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL,
    status_display TEXT NOT NULL,
    description TEXT,
    location_lat DECIMAL(10,7),
    location_lng DECIMAL(10,7),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PRODUCT ANALYTICS
-- ============================================================================

-- Product view tracking
CREATE TABLE IF NOT EXISTS public.grocery_product_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.grocery_products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    viewed_at TIMESTAMPTZ DEFAULT now()
);

-- Daily product statistics
CREATE TABLE IF NOT EXISTS public.grocery_product_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.grocery_products(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    view_count INTEGER DEFAULT 0,
    add_to_cart_count INTEGER DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    revenue INTEGER DEFAULT 0,
    UNIQUE(product_id, date)
);

-- 4. USER PREFERENCES & HISTORY
-- ============================================================================

-- Recently viewed products
CREATE TABLE IF NOT EXISTS public.grocery_recently_viewed (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.grocery_products(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, product_id)
);

-- 5. ENHANCED OFFERS SYSTEM
-- ============================================================================

-- Flash sales
CREATE TABLE IF NOT EXISTS public.grocery_flash_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    discount_percentage DECIMAL(5,2),
    discount_fixed_amount INTEGER,
    min_purchase_amount INTEGER DEFAULT 0,
    max_discount_amount INTEGER,
    product_id UUID REFERENCES public.grocery_products(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.grocery_categories(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. DELIVERY TIME SLOTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.grocery_delivery_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
    start_time TEXT NOT NULL, -- "09:00"
    end_time TEXT NOT NULL,   -- "12:00"
    slot_label TEXT NOT NULL, -- "Morning", "Afternoon", etc.
    max_orders INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    delivery_fee INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default delivery slots
INSERT INTO public.grocery_delivery_slots (day_of_week, start_time, end_time, slot_label, max_orders, is_active, delivery_fee) VALUES
(0, '09:00', '12:00', 'Morning', 50, true, 100),
(0, '12:00', '15:00', 'Afternoon', 50, true, 100),
(0, '15:00', '18:00', 'Evening', 50, true, 100),
(0, '18:00', '21:00', 'Night', 30, true, 150),
(1, '09:00', '12:00', 'Morning', 50, true, 100),
(1, '12:00', '15:00', 'Afternoon', 50, true, 100),
(1, '15:00', '18:00', 'Evening', 50, true, 100),
(1, '18:00', '21:00', 'Night', 30, true, 150),
(2, '09:00', '12:00', 'Morning', 50, true, 100),
(2, '12:00', '15:00', 'Afternoon', 50, true, 100),
(2, '15:00', '18:00', 'Evening', 50, true, 100),
(2, '18:00', '21:00', 'Night', 30, true, 150),
(3, '09:00', '12:00', 'Morning', 50, true, 100),
(3, '12:00', '15:00', 'Afternoon', 50, true, 100),
(3, '15:00', '18:00', 'Evening', 50, true, 100),
(3, '18:00', '21:00', 'Night', 30, true, 150),
(4, '09:00', '12:00', 'Morning', 50, true, 100),
(4, '12:00', '15:00', 'Afternoon', 50, true, 100),
(4, '15:00', '18:00', 'Evening', 50, true, 100),
(4, '18:00', '21:00', 'Night', 30, true, 150),
(5, '09:00', '12:00', 'Morning', 50, true, 100),
(5, '12:00', '15:00', 'Afternoon', 50, true, 100),
(5, '15:00', '18:00', 'Evening', 50, true, 100),
(5, '18:00', '21:00', 'Night', 30, true, 150),
(6, '09:00', '12:00', 'Morning', 50, true, 100),
(6, '12:00', '15:00', 'Afternoon', 50, true, 100),
(6, '15:00', '18:00', 'Evening', 50, true, 100),
(6, '18:00', '21:00', 'Night', 30, true, 150)
ON CONFLICT DO NOTHING;

-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Reviews RLS
ALTER TABLE public.grocery_product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved reviews" ON public.grocery_product_reviews FOR SELECT 
    USING (is_approved = true);
CREATE POLICY "Customers can create reviews" ON public.grocery_product_reviews FOR INSERT 
    WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Users can update own reviews" ON public.grocery_product_reviews FOR UPDATE 
    USING (auth.uid() = customer_id);
CREATE POLICY "Admins can manage all reviews" ON public.grocery_product_reviews FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Review Images RLS
ALTER TABLE public.grocery_review_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Review images are viewable by everyone" ON public.grocery_review_images FOR SELECT USING (true);
CREATE POLICY "Users can add review images" ON public.grocery_review_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage review images" ON public.grocery_review_images FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Rating Summary RLS
ALTER TABLE public.grocery_product_rating_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rating summaries are viewable by everyone" ON public.grocery_product_rating_summary FOR SELECT USING (true);
CREATE POLICY "Admins can manage rating summaries" ON public.grocery_product_rating_summary FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Order Timeline RLS
ALTER TABLE public.grocery_order_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order timeline viewable by order owner" ON public.grocery_order_timeline FOR SELECT 
    USING (order_id IN (SELECT id FROM grocery_orders WHERE customer_id = auth.uid()));
CREATE POLICY "Admins can manage order timeline" ON public.grocery_order_timeline FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can manage order timeline" ON public.grocery_order_timeline FOR ALL 
    WITH CHECK (true);

-- Product Views RLS
ALTER TABLE public.grocery_product_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product views are viewable by everyone" ON public.grocery_product_views FOR SELECT USING (true);
CREATE POLICY "Users can track their views" ON public.grocery_product_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage product views" ON public.grocery_product_views FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Recently Viewed RLS
ALTER TABLE public.grocery_recently_viewed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own recently viewed" ON public.grocery_recently_viewed FOR ALL 
    USING (auth.uid() = user_id);

-- Flash Sales RLS
ALTER TABLE public.grocery_flash_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active flash sales are viewable by everyone" ON public.grocery_flash_sales FOR SELECT 
    USING (is_active = true AND start_time <= now() AND end_time >= now());
CREATE POLICY "Admins can manage flash sales" ON public.grocery_flash_sales FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Delivery Slots RLS
ALTER TABLE public.grocery_delivery_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Delivery slots are viewable by everyone" ON public.grocery_delivery_slots FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage delivery slots" ON public.grocery_delivery_slots FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Daily Stats RLS
ALTER TABLE public.grocery_product_daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Daily stats are viewable by everyone" ON public.grocery_product_daily_stats FOR SELECT USING (true);
CREATE POLICY "Admins can manage daily stats" ON public.grocery_product_daily_stats FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 8. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_grocery_product_reviews_updated_at 
    BEFORE UPDATE ON public.grocery_product_reviews 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grocery_flash_sales_updated_at 
    BEFORE UPDATE ON public.grocery_flash_sales 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grocery_product_rating_summary_updated_at 
    BEFORE UPDATE ON public.grocery_product_rating_summary 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. FUNCTIONS
-- ============================================================================

-- Function to update product rating summary
CREATE OR REPLACE FUNCTION public.update_product_rating_summary()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO grocery_product_rating_summary (product_id, average_rating, total_reviews, five_star_count, four_star_count, three_star_count, two_star_count, one_star_count)
    SELECT 
        NEW.product_id,
        COALESCE(AVG(rating), 0),
        COUNT(*),
        COUNT(*) FILTER (WHERE rating = 5),
        COUNT(*) FILTER (WHERE rating = 4),
        COUNT(*) FILTER (WHERE rating = 3),
        COUNT(*) FILTER (WHERE rating = 2),
        COUNT(*) FILTER (WHERE rating = 1)
    FROM grocery_product_reviews
    WHERE product_id = NEW.product_id AND is_approved = true
    ON CONFLICT (product_id) DO UPDATE SET
        average_rating = EXCLUDED.average_rating,
        total_reviews = EXCLUDED.total_reviews,
        five_star_count = EXCLUDED.five_star_count,
        four_star_count = EXCLUDED.four_star_count,
        three_star_count = EXCLUDED.three_star_count,
        two_star_count = EXCLUDED.two_star_count,
        one_star_count = EXCLUDED.one_star_count,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update rating on review insert/update
CREATE OR REPLACE TRIGGER trigger_update_rating_summary
    AFTER INSERT OR UPDATE ON public.grocery_product_reviews
    FOR EACH ROW
    WHEN (NEW.is_approved = true)
    EXECUTE FUNCTION public.update_product_rating_summary();

-- Function to add order timeline
CREATE OR REPLACE FUNCTION public.add_grocery_order_timeline(
    p_order_id UUID,
    p_status TEXT,
    p_status_display TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO grocery_order_timeline (order_id, status, status_display, description)
    VALUES (p_order_id, p_status, p_status_display, p_description);
END;
$$ LANGUAGE plpgsql;

-- 10. REALTIME
-- ============================================================================

ALTER TABLE public.grocery_product_reviews REPLICA IDENTITY FULL;
ALTER TABLE public.grocery_flash_sales REPLICA IDENTITY FULL;
ALTER TABLE public.grocery_delivery_slots REPLICA IDENTITY FULL;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_product_reviews;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_flash_sales;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_delivery_slots;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 11. SEED DATA - SAMPLE CATEGORIES
-- ============================================================================

INSERT INTO public.grocery_categories (name, sort_order, is_active) VALUES
('Fruits & Vegetables', 1, true),
('Meat & Poultry', 2, true),
('Dairy & Eggs', 3, true),
('Bakery', 4, true),
('Beverages', 5, true),
('Snacks & Chips', 6, true),
('Household Essentials', 7, true),
('Personal Care', 8, true),
('Baby Products', 9, true),
('Frozen Foods', 10, true)
ON CONFLICT DO NOTHING;
