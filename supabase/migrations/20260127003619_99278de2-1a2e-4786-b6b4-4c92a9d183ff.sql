-- Create promo_banners table for admin-controlled special offer banners
CREATE TABLE public.promo_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heading_en TEXT NOT NULL DEFAULT '',
  heading_ur TEXT NOT NULL DEFAULT '',
  description_en TEXT,
  description_ur TEXT,
  icon TEXT DEFAULT '🎉',
  background_type TEXT NOT NULL DEFAULT 'gradient' CHECK (background_type IN ('gradient', 'image')),
  background_value TEXT NOT NULL DEFAULT 'linear-gradient(135deg, #ff6a00 0%, #ff3d00 100%)',
  is_active BOOLEAN NOT NULL DEFAULT false,
  click_action TEXT NOT NULL DEFAULT 'none' CHECK (click_action IN ('none', 'restaurants', 'categories', 'external')),
  external_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

-- Public read policy for active banners (customers can see active banners)
CREATE POLICY "Anyone can view active banners"
ON public.promo_banners
FOR SELECT
USING (is_active = true);

-- Admins can manage all banners
CREATE POLICY "Admins can manage all banners"
ON public.promo_banners
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_promo_banners_updated_at
BEFORE UPDATE ON public.promo_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default banner
INSERT INTO public.promo_banners (
  heading_en, heading_ur, description_en, description_ur, 
  icon, background_type, background_value, is_active, click_action
) VALUES (
  'Free Delivery on First Order!',
  'پہلے آرڈر پر مفت ڈیلیوری!',
  'Order now and save on delivery',
  'ابھی آرڈر کریں اور بچت کریں',
  '🎉',
  'gradient',
  'linear-gradient(135deg, #ff6a00 0%, #ff3d00 100%)',
  true,
  'restaurants'
);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.promo_banners;