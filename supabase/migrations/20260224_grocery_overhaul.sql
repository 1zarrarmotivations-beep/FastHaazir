-- ============================================================================
-- FAST HAAZIR - GROCERY OVERHAUL DATABASE SCHEMA
-- ============================================================================

-- 1. ENUMS & TYPES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grocery_pricing_type') THEN
        CREATE TYPE public.grocery_pricing_type AS ENUM ('per_kg', 'per_gram', 'per_piece', 'fixed_pack');
    END IF;
END $$;

-- 2. CATEGORIES
CREATE TABLE IF NOT EXISTS public.grocery_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PRODUCTS
CREATE TABLE IF NOT EXISTS public.grocery_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.grocery_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    pricing_type public.grocery_pricing_type DEFAULT 'per_piece',
    base_price INTEGER NOT NULL DEFAULT 0,
    discount_price INTEGER,
    min_quantity DECIMAL DEFAULT 1,
    max_quantity DECIMAL DEFAULT 100,
    stock_quantity DECIMAL DEFAULT 0,
    low_stock_threshold DECIMAL DEFAULT 5,
    is_visible BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    is_trending BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. VARIANTS (Weight-based options)
CREATE TABLE IF NOT EXISTS public.grocery_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.grocery_products(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL, -- e.g., "500g", "1kg", "5kg", "Pack of 12"
    weight_in_grams DECIMAL,
    price INTEGER NOT NULL,
    discount_price INTEGER,
    stock_quantity DECIMAL DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. SETTINGS
CREATE TABLE IF NOT EXISTS public.grocery_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_order_value INTEGER DEFAULT 500,
    free_delivery_threshold INTEGER DEFAULT 1500,
    delivery_fee INTEGER DEFAULT 150,
    estimated_delivery_time TEXT DEFAULT '45-60 min',
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert initial settings if not exists
INSERT INTO public.grocery_settings (id, min_order_value, free_delivery_threshold, delivery_fee, estimated_delivery_time, is_active)
VALUES (gen_random_uuid(), 500, 1500, 150, '45-60 min', true)
ON CONFLICT DO NOTHING;

-- 6. ORDERS
CREATE TABLE IF NOT EXISTS public.grocery_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'placed', -- placed, preparing, on_way, delivered, cancelled
    subtotal INTEGER NOT NULL DEFAULT 0,
    discount_amount INTEGER DEFAULT 0,
    delivery_fee INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    delivery_address TEXT,
    delivery_lat DECIMAL(10,7),
    delivery_lng DECIMAL(10,7),
    notes TEXT,
    estimated_delivery_time TEXT,
    otp_code TEXT,
    otp_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.grocery_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.grocery_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.grocery_products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES public.grocery_variants(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity DECIMAL NOT NULL,
    unit_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. OFFERS
CREATE TABLE IF NOT EXISTS public.grocery_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    discount_percentage DECIMAL,
    discount_fixed_amount INTEGER,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grocery_product_offers (
    product_id UUID REFERENCES public.grocery_products(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES public.grocery_offers(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, offer_id)
);

-- 9. REPEAT ORDERS (Last Order storage)
CREATE TABLE IF NOT EXISTS public.user_grocery_favorites (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.grocery_products(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, product_id)
);

-- 10. RLS POLICIES

-- Categories
ALTER TABLE public.grocery_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public categories are viewable by everyone" ON public.grocery_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.grocery_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Products
ALTER TABLE public.grocery_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visible products are viewable by everyone" ON public.grocery_products FOR SELECT USING (is_visible = true);
CREATE POLICY "Admins can manage products" ON public.grocery_products FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Variants
ALTER TABLE public.grocery_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Variants are viewable by everyone" ON public.grocery_variants FOR SELECT USING (true);
CREATE POLICY "Admins can manage variants" ON public.grocery_variants FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Settings
ALTER TABLE public.grocery_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are viewable by everyone" ON public.grocery_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.grocery_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Orders
ALTER TABLE public.grocery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view their own orders" ON public.grocery_orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can create their own orders" ON public.grocery_orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Admins can manage all orders" ON public.grocery_orders FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Riders can view assigned orders" ON public.grocery_orders FOR SELECT USING (
    rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid())
);

-- Order Items
ALTER TABLE public.grocery_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view their own order items" ON public.grocery_order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM grocery_orders WHERE id = order_id AND customer_id = auth.uid())
);
CREATE POLICY "Admins can manage all order items" ON public.grocery_order_items FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Offers
ALTER TABLE public.grocery_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active offers are viewable by everyone" ON public.grocery_offers FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage offers" ON public.grocery_offers FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Product Offers
ALTER TABLE public.grocery_product_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product offers are viewable by everyone" ON public.grocery_product_offers FOR SELECT USING (true);
CREATE POLICY "Admins can manage product offers" ON public.grocery_product_offers FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Favorites
ALTER TABLE public.user_grocery_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own favorites" ON public.user_grocery_favorites FOR ALL USING (auth.uid() = user_id);

-- 11. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('grocery', 'grocery', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public access to grocery images" ON storage.objects FOR SELECT USING (bucket_id = 'grocery');
CREATE POLICY "Admins can upload grocery images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'grocery' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 12. REALTIME
ALTER TABLE public.grocery_products REPLICA IDENTITY FULL;
ALTER TABLE public.grocery_categories REPLICA IDENTITY FULL;
ALTER TABLE public.grocery_orders REPLICA IDENTITY FULL;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_products;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_categories;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_orders;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 13. TRIGGERS FOR UPDATED_AT
CREATE TRIGGER update_grocery_categories_updated_at BEFORE UPDATE ON public.grocery_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_grocery_products_updated_at BEFORE UPDATE ON public.grocery_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_grocery_variants_updated_at BEFORE UPDATE ON public.grocery_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_grocery_settings_updated_at BEFORE UPDATE ON public.grocery_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_grocery_orders_updated_at BEFORE UPDATE ON public.grocery_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_grocery_offers_updated_at BEFORE UPDATE ON public.grocery_offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
