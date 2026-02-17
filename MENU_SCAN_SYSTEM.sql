-- ============================================================================
-- FAST HAAZIR - MENU SCAN & AUTO ADD SYSTEM
-- Database Migration for Professional Menu Management
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE CATEGORIES TABLE
-- ============================================================================

-- Categories Table with Lock Feature for Medicine
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT false,  -- For Medicine category protection
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_business_category UNIQUE (business_id, name)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_categories_business_id ON public.categories(business_id);
CREATE INDEX IF NOT EXISTS idx_categories_business_active ON public.categories(business_id, is_active);

-- ============================================================================
-- PART 2: UPDATE MENU_ITEMS TABLE
-- ============================================================================

-- Add category_id column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE public.menu_items ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add is_deleted column for soft delete
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.menu_items ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add is_draft column for preview/draft system
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'is_draft'
  ) THEN
    ALTER TABLE public.menu_items ADD COLUMN is_draft BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add original_price for tracking price changes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'original_price'
  ) THEN
    ALTER TABLE public.menu_items ADD COLUMN original_price INTEGER;
  END IF;
END $$;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_menu_items_business_active ON public.menu_items(business_id, is_available, is_deleted);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);

-- ============================================================================
-- PART 3: CREATE MENU UPLOAD DRAFTS TABLE (For Preview System)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.menu_upload_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',  -- Array of menu items
  file_name TEXT,
  file_type TEXT,
  status TEXT DEFAULT 'pending',  -- pending, published, discarded
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_menu_upload_drafts_business ON public.menu_upload_drafts(business_id);
CREATE INDEX IF NOT EXISTS idx_menu_upload_drafts_status ON public.menu_upload_drafts(status);

-- ============================================================================
-- PART 4: AUTO CREATE MEDICINE CATEGORY FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_medicine_category(business_id UUID)
RETURNS UUID AS $$
DECLARE
  category_id UUID;
  existing_category UUID;
BEGIN
  -- Check if Medicine category already exists for this business
  SELECT id INTO existing_category
  FROM public.categories
  WHERE business_id = business_id 
    AND LOWER(name) = 'medicine'
    AND is_active = true;

  IF existing_category IS NOT NULL THEN
    RETURN existing_category;
  END IF;

  -- Create Medicine category with lock
  INSERT INTO public.categories (business_id, name, is_locked, sort_order)
  VALUES (business_id, 'Medicine', true, 999)
  RETURNING id INTO category_id;

  RETURN category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 5: AUTO CATEGORY CREATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_category(
  p_business_id UUID,
  p_category_name TEXT
)
RETURNS UUID AS $$
DECLARE
  category_id UUID;
  category_name_normalized TEXT;
BEGIN
  -- Normalize category name
  category_name_normalized := TRIM(INITCAP(LOWER(p_category_name)));
  
  -- Handle empty or null category
  IF category_name_normalized IS NULL OR category_name_normalized = '' THEN
    category_name_normalized := 'General';
  END IF;

  -- Check if category exists
  SELECT id INTO category_id
  FROM public.categories
  WHERE business_id = p_business_id 
    AND LOWER(name) = LOWER(category_name_normalized)
    AND is_active = true;

  -- Create if doesn't exist
  IF category_id IS NULL THEN
    INSERT INTO public.categories (business_id, name, is_locked, sort_order)
    VALUES (p_business_id, category_name_normalized, false, 
      (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.categories WHERE business_id = p_business_id)
    )
    RETURNING id INTO category_id;
  END IF;

  RETURN category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 6: DUPLICATE DETECTION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_duplicate_menu_item(
  p_business_id UUID,
  p_name TEXT,
  p_category_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  exists_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO exists_count
  FROM public.menu_items
  WHERE business_id = p_business_id
    AND LOWER(name) = LOWER(TRIM(p_name))
    AND is_deleted = false
    AND (p_category_id IS NULL OR category_id = p_category_id);

  RETURN exists_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 7: BULK MENU OPERATIONS FUNCTIONS
-- ============================================================================

-- Bulk update prices
CREATE OR REPLACE FUNCTION public.bulk_update_menu_prices(
  p_business_id UUID,
  p_price_change_percent NUMERIC,  -- e.g., 10 for +10%, -10 for -10%
  p_category_id UUID DEFAULT NULL,
  p_item_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_item_ids IS NOT NULL AND array_length(p_item_ids, 1) > 0 THEN
    -- Update specific items
    UPDATE public.menu_items
    SET price = ROUND(price * (1 + p_price_change_percent / 100)),
        original_price = price,
        updated_at = NOW()
    WHERE id = ANY(p_item_ids)
      AND business_id = p_business_id
      AND is_deleted = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  ELSIF p_category_id IS NOT NULL THEN
    -- Update all items in category
    UPDATE public.menu_items
    SET price = ROUND(price * (1 + p_price_change_percent / 100)),
        original_price = price,
        updated_at = NOW()
    WHERE business_id = p_business_id
      AND category_id = p_category_id
      AND is_deleted = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  ELSE
    -- Update all items for business
    UPDATE public.menu_items
    SET price = ROUND(price * (1 + p_price_change_percent / 100)),
        original_price = price,
        updated_at = NOW()
    WHERE business_id = p_business_id
      AND is_deleted = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  END IF;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk soft delete
CREATE OR REPLACE FUNCTION public.bulk_soft_delete_menu_items(
  p_business_id UUID,
  p_item_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE public.menu_items
  SET is_deleted = true,
      updated_at = NOW()
  WHERE id = ANY(p_item_ids)
    AND business_id = p_business_id
    AND is_deleted = false;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk availability toggle
CREATE OR REPLACE FUNCTION public.bulk_toggle_menu_availability(
  p_business_id UUID,
  p_item_ids UUID[],
  p_is_available BOOLEAN
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.menu_items
  SET is_available = p_is_available,
      updated_at = NOW()
  WHERE id = ANY(p_item_ids)
    AND business_id = p_business_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 8: SECURITY - RLS POLICIES
-- ============================================================================

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Enable read access for all users" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.categories
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Enable update for authenticated users" ON public.categories
  FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role'));

-- Prevent deletion of locked categories (Medicine)
CREATE OR REPLACE FUNCTION public.prevent_locked_category_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_locked = true THEN
    RAISE EXCEPTION 'Cannot delete locked category: %', OLD.name;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_locked_category_delete ON public.categories;
CREATE TRIGGER prevent_locked_category_delete
  BEFORE DELETE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_category_delete();

-- Menu Upload Drafts policies
ALTER TABLE public.menu_upload_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.menu_upload_drafts
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.menu_upload_drafts
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Enable update for authenticated users" ON public.menu_upload_drafts
  FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role'));

-- ============================================================================
-- PART 9: TRIGGER TO AUTO-CREATE MEDICINE CATEGORY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_ensure_medicine_category()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure Medicine category exists for the business
  PERFORM public.ensure_medicine_category(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_medicine_on_business_create ON public.businesses;
CREATE TRIGGER ensure_medicine_on_business_create
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_ensure_medicine_category();

-- ============================================================================
-- PART 10: VIEWS FOR MENU MANAGEMENT
-- ============================================================================

-- View: Menu items with category info
CREATE OR REPLACE VIEW public.menu_items_with_categories AS
SELECT 
  mi.*,
  c.name as category_name,
  c.is_locked as category_locked,
  b.name as business_name,
  b.is_active as business_is_active
FROM public.menu_items mi
LEFT JOIN public.categories c ON mi.category_id = c.id
LEFT JOIN public.businesses b ON mi.business_id = b.id
WHERE mi.is_deleted = false;

-- View: Business menu summary
CREATE OR REPLACE VIEW public.business_menu_summary AS
SELECT 
  b.id as business_id,
  b.name as business_name,
  b.type as business_type,
  b.is_active as business_is_active,
  COUNT(DISTINCT c.id) as total_categories,
  COUNT(DISTINCT mi.id) as total_items,
  COUNT(DISTINCT CASE WHEN mi.is_available = true THEN mi.id END) as available_items,
  COUNT(DISTINCT CASE WHEN c.name = 'Medicine' THEN mi.id END) as medicine_items,
  MIN(CASE WHEN mi.is_available = true THEN mi.price END) as min_price,
  MAX(CASE WHEN mi.is_available = true THEN mi.price END) as max_price
FROM public.businesses b
LEFT JOIN public.categories c ON c.business_id = b.id AND c.is_active = true
LEFT JOIN public.menu_items mi ON mi.business_id = b.id AND mi.is_deleted = false
GROUP BY b.id, b.name, b.type, b.is_active;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Menu Scan System Database Setup Complete!' as status;
