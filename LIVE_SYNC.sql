
-- 1. ADD MISSING COLUMNS TO CORE TABLES
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS location_address TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS location_lat NUMERIC;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS location_lng NUMERIC;

-- 2. CREATE PROMO BANNERS TABLE (For Carousel)
CREATE TABLE IF NOT EXISTS public.promo_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heading_en TEXT NOT NULL DEFAULT '',
  heading_ur TEXT NOT NULL DEFAULT '',
  description_en TEXT,
  description_ur TEXT,
  subtitle_en TEXT,
  subtitle_ur TEXT,
  button_text_en TEXT,
  button_text_ur TEXT,
  icon TEXT DEFAULT '🎉',
  background_type TEXT NOT NULL DEFAULT 'gradient' CHECK (background_type IN ('gradient', 'image')),
  background_value TEXT NOT NULL DEFAULT 'linear-gradient(135deg, #ff6a00 0%, #ff3d00 100%)',
  is_active BOOLEAN NOT NULL DEFAULT true,
  click_action TEXT NOT NULL DEFAULT 'none',
  external_url TEXT,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. ENABLE REALTIME
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'promo_banners') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.promo_banners;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. FIX BUSINESSES SYNC (Dynamic View for Instant Updates)
DO $$
BEGIN
    -- Drop the table public_businesses if it exists as a base table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'public_businesses' AND table_type = 'BASE TABLE') THEN
        DROP TABLE public.public_businesses CASCADE;
    END IF;
END $$;

-- Create/Replace the view
CREATE OR REPLACE VIEW public.public_businesses AS
SELECT 
    id, name, type, image, rating, eta, distance, 
    category, description, featured, is_active, is_approved,
    updated_at, created_at, deleted_at,
    location_address, location_lat, location_lng
FROM public.businesses
WHERE deleted_at IS NULL;

-- 5. GRANT PERMISSIONS
GRANT SELECT ON public.public_businesses TO anon, authenticated;
GRANT SELECT ON public.promo_banners TO anon, authenticated;
GRANT SELECT ON public.menu_items TO anon, authenticated;

-- 6. SECURITY POLICIES
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active banners" ON public.promo_banners;
CREATE POLICY "Anyone can view active banners" ON public.promo_banners FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage all banners" ON public.promo_banners;
CREATE POLICY "Admins can manage all banners" ON public.promo_banners FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 7. SET DEFAULTS FOR NEW ENTRIES
ALTER TABLE public.businesses ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE public.businesses ALTER COLUMN is_approved SET DEFAULT true;

-- 8. INITIAL DATA
INSERT INTO public.promo_banners (heading_en, heading_ur, is_active, click_action)
VALUES ('Welcome to Fast Haazir!', 'فاسٹ حاضر میں خوش آمدید!', true, 'restaurants')
ON CONFLICT DO NOTHING;
