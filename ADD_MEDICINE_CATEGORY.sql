-- Add Medicine category to grocery section with 5 test items

-- First, ensure the grocery_categories table exists
CREATE TABLE IF NOT EXISTS public.grocery_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add Medicine category if not exists
INSERT INTO public.grocery_categories (name, description, sort_order, is_active)
VALUES ('Medicine', 'Essential medicines and health products', 10, true)
ON CONFLICT DO NOTHING;

-- Get the Medicine category ID
DO $$
DECLARE
    medicine_cat_id UUID;
BEGIN
    SELECT id INTO medicine_cat_id FROM public.grocery_categories WHERE name = 'Medicine' LIMIT 1;
    
    -- If category exists, add test medicine products
    IF medicine_cat_id IS NOT NULL THEN
        INSERT INTO public.grocery_products (category_id, name, description, price, image_url, stock_quantity, is_available, is_visible, is_featured, is_trending)
        VALUES 
        (medicine_cat_id, 'Panadol Extra', 'Fast relief from pain and fever', 30, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200', 100, true, true, true, true),
        (medicine_cat_id, 'Brufen 400mg', 'Anti-inflammatory pain reliever', 25, 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=200', 100, true, true, true, false),
        (medicine_cat_id, 'Disprin', 'Effervescent pain relief', 20, 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200', 100, true, true, false, true),
        (medicine_cat_id, 'Cough Syrup', 'Effective cough relief syrup', 85, 'https://images.unsplash.com/photo-1550572017-4e7d64f9d5de?w=200', 50, true, true, true, false),
        (medicine_cat_id, 'ORS Powder', 'Oral rehydration salts for dehydration', 15, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200', 200, true, true, false, true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Enable RLS on tables if not already enabled
ALTER TABLE public.grocery_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for grocery_categories (allow read for all, write for authenticated)
DROP POLICY IF EXISTS "Anyone can read grocery_categories" ON public.grocery_categories;
CREATE POLICY "Anyone can read grocery_categories" ON public.grocery_categories FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage grocery_categories" ON public.grocery_categories;
CREATE POLICY "Admins can manage grocery_categories" ON public.grocery_categories FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Create RLS policies for grocery_products
DROP POLICY IF EXISTS "Anyone can read grocery_products" ON public.grocery_products;
CREATE POLICY "Anyone can read grocery_products" ON public.grocery_products FOR SELECT TO anon, authenticated USING (is_visible = true);

DROP POLICY IF EXISTS "Admins can manage grocery_products" ON public.grocery_products;
CREATE POLICY "Admins can manage grocery_products" ON public.grocery_products FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_grocery_categories_sort ON public.grocery_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_grocery_products_category ON public.grocery_products(category_id);
CREATE INDEX IF NOT EXISTS idx_grocery_products_visible ON public.grocery_products(is_visible);

SELECT 'Medicine category and 5 test products added successfully!' as result;
