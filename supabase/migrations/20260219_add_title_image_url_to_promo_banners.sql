-- Add title, subtitle, image_url to promo_banners
-- This standardizes the schema for the new banner management system
ALTER TABLE public.promo_banners
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Optional: Migrate existing data if needed (e.g. heading_en -> title)
UPDATE public.promo_banners
SET 
  title = COALESCE(heading_en, ''),
  subtitle = COALESCE(subtitle_en, description_en),
  image_url = CASE WHEN background_type = 'image' THEN background_value ELSE NULL END
WHERE title IS NULL;
