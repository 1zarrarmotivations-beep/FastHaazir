-- Add new columns to promo_banners for multi-banner carousel system
ALTER TABLE public.promo_banners 
ADD COLUMN IF NOT EXISTS subtitle_en TEXT,
ADD COLUMN IF NOT EXISTS subtitle_ur TEXT,
ADD COLUMN IF NOT EXISTS button_text_en TEXT,
ADD COLUMN IF NOT EXISTS button_text_ur TEXT,
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL;

-- Update click_action to include 'business' option
ALTER TABLE public.promo_banners 
DROP CONSTRAINT IF EXISTS promo_banners_click_action_check;

-- Add comment for documentation
COMMENT ON COLUMN public.promo_banners.start_date IS 'Banner starts showing from this date/time';
COMMENT ON COLUMN public.promo_banners.end_date IS 'Banner stops showing after this date/time';
COMMENT ON COLUMN public.promo_banners.business_id IS 'Target business for click_action = business';