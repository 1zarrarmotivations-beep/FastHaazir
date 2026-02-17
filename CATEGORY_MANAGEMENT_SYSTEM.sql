-- ============================================================================
-- FAST HAAZIR - COMPREHENSIVE CATEGORY MANAGEMENT SYSTEM
-- Database Migration for Advanced Category Features
-- ============================================================================

-- ============================================================================
-- PART 1: ENHANCED CATEGORIES TABLE WITH HIERARCHY SUPPORT
-- ============================================================================

-- First, add new columns to existing categories table
DO $$ 
BEGIN
  -- Add parent_id for nested subcategories
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;

  -- Add multi-language support
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'name_ur'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN name_ur TEXT;
  END IF;

  -- Add description
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN description TEXT;
  END IF;

  -- Add description in Urdu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'description_ur'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN description_ur TEXT;
  END IF;

  -- Add image/icon URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN image_url TEXT;
  END IF;

  -- Add icon name (for icon libraries like Lucide)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'icon_name'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN icon_name TEXT;
  END IF;

  -- Add SEO-friendly slug
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'slug'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN slug TEXT UNIQUE;
  END IF;

  -- Add availability schedule (JSONB for flexible scheduling)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'availability_schedule'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN availability_schedule JSONB DEFAULT '{}';
  END IF;

  -- Add depth level for hierarchy
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'depth_level'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN depth_level INTEGER DEFAULT 0;
  END IF;

  -- Add path for hierarchy traversal (materialized path)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'path'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN path TEXT;
  END IF;

  -- Add metadata for extensibility
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;

  -- Add soft delete
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create indexes for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_depth ON public.categories(depth_level);
CREATE INDEX IF NOT EXISTS idx_categories_path ON public.categories(path);
CREATE INDEX IF NOT EXISTS idx_categories_deleted ON public.categories(deleted_at);

-- ============================================================================
-- PART 2: CATEGORY-PRODUCT ASSOCIATION TABLE (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  category_specific_price INTEGER,
  category_specific_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure a product can only be in a category once
  CONSTRAINT unique_product_category UNIQUE (product_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_product ON public.product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category ON public.product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_primary ON public.product_categories(product_id, is_primary);

-- ============================================================================
-- PART 3: HELPER FUNCTIONS FOR CATEGORY MANAGEMENT
-- ============================================================================

-- Function to generate SEO-friendly slug
CREATE OR REPLACE FUNCTION public.generate_category_slug(
  p_name TEXT,
  p_business_id UUID,
  p_parent_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from name
  base_slug := LOWER(TRIM(p_name));
  base_slug := REGEXP_REPLACE(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  -- Add parent prefix if exists
  IF p_parent_id IS NOT NULL THEN
    DECLARE
      parent_slug TEXT;
    BEGIN
      SELECT slug INTO parent_slug FROM public.categories WHERE id = p_parent_id;
      IF parent_slug IS NOT NULL THEN
        base_slug := parent_slug || '-' || base_slug;
      END IF;
    END;
  END IF;
  
  -- Check for uniqueness within business
  final_slug := base_slug;
  
  WHILE EXISTS (
    SELECT 1 FROM public.categories 
    WHERE slug = final_slug 
      AND business_id = p_business_id
      AND deleted_at IS NULL
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate depth level and path
CREATE OR REPLACE FUNCTION public.calculate_category_hierarchy(
  p_parent_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  parent_depth INTEGER;
  parent_path TEXT;
BEGIN
  IF p_parent_id IS NULL THEN
    RETURN 0;
  END IF;
  
  SELECT depth_level, path INTO parent_depth, parent_path
  FROM public.categories
  WHERE id = p_parent_id;
  
  RETURN COALESCE(parent_depth, 0) + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for circular references
CREATE OR REPLACE FUNCTION public.check_circular_reference(
  p_category_id UUID,
  p_parent_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  current_parent UUID;
BEGIN
  IF p_parent_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if parent is the same as category
  IF p_category_id = p_parent_id THEN
    RETURN true;
  END IF;
  
  -- Traverse up the tree to check for circular reference
  current_parent := p_parent_id;
  
  WHILE current_parent IS NOT NULL LOOP
    IF current_parent = p_category_id THEN
      RETURN true;
    END IF;
    
    SELECT parent_id INTO current_parent
    FROM public.categories
    WHERE id = current_parent;
  END LOOP;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if category has active products
CREATE OR REPLACE FUNCTION public.category_has_active_products(
  p_category_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  product_count INTEGER;
BEGIN
  -- Check direct products
  SELECT COUNT(*) INTO product_count
  FROM public.menu_items
  WHERE category_id = p_category_id
    AND is_deleted = false
    AND is_available = true;
  
  IF product_count > 0 THEN
    RETURN true;
  END IF;
  
  -- Check products via product_categories table
  SELECT COUNT(*) INTO product_count
  FROM public.product_categories pc
  JOIN public.menu_items mi ON mi.id = pc.product_id
  WHERE pc.category_id = p_category_id
    AND mi.is_deleted = false
    AND mi.is_available = true;
  
  RETURN product_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if category has subcategories
CREATE OR REPLACE FUNCTION public.category_has_subcategories(
  p_category_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  subcat_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO subcat_count
  FROM public.categories
  WHERE parent_id = p_category_id
    AND deleted_at IS NULL;
  
  RETURN subcat_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: TRIGGERS FOR AUTO-POPULATING FIELDS
-- ============================================================================

-- Trigger to auto-generate slug and hierarchy on insert
CREATE OR REPLACE FUNCTION public.auto_populate_category_fields()
RETURNS TRIGGER AS $$
DECLARE
  parent_depth INTEGER;
  parent_path TEXT;
BEGIN
  -- Generate slug if not provided
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_category_slug(NEW.name, NEW.business_id, NEW.parent_id);
  END IF;
  
  -- Calculate depth level and path
  IF NEW.parent_id IS NULL THEN
    NEW.depth_level := 0;
    NEW.path := NEW.id::TEXT;
  ELSE
    SELECT depth_level, path INTO parent_depth, parent_path
    FROM public.categories
    WHERE id = NEW.parent_id;
    
    NEW.depth_level := COALESCE(parent_depth, 0) + 1;
    NEW.path := COALESCE(parent_path, '') || '/' || NEW.id::TEXT;
  END IF;
  
  -- Set Urdu name if not provided (copy from English)
  IF NEW.name_ur IS NULL THEN
    NEW.name_ur := NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_populate_category_fields ON public.categories;
CREATE TRIGGER auto_populate_category_fields
  BEFORE INSERT ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.auto_populate_category_fields();

-- Trigger to update hierarchy on parent change
CREATE OR REPLACE FUNCTION public.update_category_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  parent_depth INTEGER;
  parent_path TEXT;
BEGIN
  -- Only process if parent_id changed
  IF OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
    -- Check for circular reference
    IF public.check_circular_reference(NEW.id, NEW.parent_id) THEN
      RAISE EXCEPTION 'Circular reference detected: cannot set parent to a descendant category';
    END IF;
    
    -- Recalculate depth and path
    IF NEW.parent_id IS NULL THEN
      NEW.depth_level := 0;
      NEW.path := NEW.id::TEXT;
    ELSE
      SELECT depth_level, path INTO parent_depth, parent_path
      FROM public.categories
      WHERE id = NEW.parent_id;
      
      NEW.depth_level := COALESCE(parent_depth, 0) + 1;
      NEW.path := COALESCE(parent_path, '') || '/' || NEW.id::TEXT;
    END IF;
    
    -- Update slug to reflect new hierarchy
    NEW.slug := public.generate_category_slug(NEW.name, NEW.business_id, NEW.parent_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_category_hierarchy ON public.categories;
CREATE TRIGGER update_category_hierarchy
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_category_hierarchy();

-- ============================================================================
-- PART 5: CRUD FUNCTIONS FOR CATEGORIES
-- ============================================================================

-- Create Category with full validation
CREATE OR REPLACE FUNCTION public.create_category(
  p_business_id UUID,
  p_name TEXT,
  p_name_ur TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_description_ur TEXT DEFAULT NULL,
  p_parent_id UUID DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_icon_name TEXT DEFAULT NULL,
  p_sort_order INTEGER DEFAULT 0,
  p_availability_schedule JSONB DEFAULT '{}',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  new_category_id UUID;
BEGIN
  -- Validate name
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Category name is required';
  END IF;
  
  -- Check for circular reference if parent is specified
  IF p_parent_id IS NOT NULL THEN
    -- Verify parent exists and belongs to same business
    IF NOT EXISTS (
      SELECT 1 FROM public.categories
      WHERE id = p_parent_id 
        AND business_id = p_business_id
        AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Parent category not found or does not belong to this business';
    END IF;
  END IF;
  
  -- Check for duplicate name within same parent scope
  IF EXISTS (
    SELECT 1 FROM public.categories
    WHERE business_id = p_business_id
      AND LOWER(name) = LOWER(TRIM(p_name))
      AND parent_id IS NOT DISTINCT FROM p_parent_id
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Category with this name already exists in this scope';
  END IF;
  
  -- Insert the category
  INSERT INTO public.categories (
    business_id,
    name,
    name_ur,
    description,
    description_ur,
    parent_id,
    image_url,
    icon_name,
    sort_order,
    availability_schedule,
    metadata,
    is_active,
    is_locked
  ) VALUES (
    p_business_id,
    TRIM(p_name),
    COALESCE(p_name_ur, TRIM(p_name)),
    p_description,
    p_description_ur,
    p_parent_id,
    p_image_url,
    p_icon_name,
    p_sort_order,
    p_availability_schedule,
    p_metadata,
    true,
    false
  )
  RETURNING id INTO new_category_id;
  
  RETURN new_category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Category
CREATE OR REPLACE FUNCTION public.update_category(
  p_category_id UUID,
  p_name TEXT DEFAULT NULL,
  p_name_ur TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_description_ur TEXT DEFAULT NULL,
  p_parent_id UUID DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_icon_name TEXT DEFAULT NULL,
  p_sort_order INTEGER DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_availability_schedule JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  cat_business_id UUID;
  cat_is_locked BOOLEAN;
BEGIN
  -- Get current category
  SELECT business_id, is_locked INTO cat_business_id, cat_is_locked
  FROM public.categories
  WHERE id = p_category_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found';
  END IF;
  
  -- Check if category is locked
  IF cat_is_locked AND p_name IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot modify name of locked category';
  END IF;
  
  -- Check for circular reference if parent is being changed
  IF p_parent_id IS NOT NULL THEN
    IF public.check_circular_reference(p_category_id, p_parent_id) THEN
      RAISE EXCEPTION 'Circular reference detected';
    END IF;
    
    -- Verify parent belongs to same business
    IF NOT EXISTS (
      SELECT 1 FROM public.categories
      WHERE id = p_parent_id 
        AND business_id = cat_business_id
        AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Parent category not found or invalid';
    END IF;
  END IF;
  
  -- Build and execute update
  UPDATE public.categories
  SET 
    name = COALESCE(p_name, name),
    name_ur = COALESCE(p_name_ur, name_ur),
    description = COALESCE(p_description, description),
    description_ur = COALESCE(p_description_ur, description_ur),
    parent_id = CASE WHEN p_parent_id IS NOT NULL THEN p_parent_id ELSE parent_id END,
    image_url = COALESCE(p_image_url, image_url),
    icon_name = COALESCE(p_icon_name, icon_name),
    sort_order = COALESCE(p_sort_order, sort_order),
    is_active = COALESCE(p_is_active, is_active),
    availability_schedule = COALESCE(p_availability_schedule, availability_schedule),
    metadata = COALESCE(p_metadata, metadata),
    updated_at = NOW()
  WHERE id = p_category_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Soft Delete Category
CREATE OR REPLACE FUNCTION public.delete_category(
  p_category_id UUID,
  p_force BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  cat_name TEXT;
  cat_is_locked BOOLEAN;
  has_products BOOLEAN;
  has_subcategories BOOLEAN;
BEGIN
  -- Get category info
  SELECT name, is_locked INTO cat_name, cat_is_locked
  FROM public.categories
  WHERE id = p_category_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found or already deleted';
  END IF;
  
  -- Check if locked
  IF cat_is_locked THEN
    RAISE EXCEPTION 'Cannot delete locked category: %', cat_name;
  END IF;
  
  -- Check for active products
  has_products := public.category_has_active_products(p_category_id);
  
  -- Check for subcategories
  has_subcategories := public.category_has_subcategories(p_category_id);
  
  -- Prevent deletion if has products or subcategories (unless force)
  IF has_products AND NOT p_force THEN
    RAISE EXCEPTION 'Cannot delete category with active products. Move or delete products first, or use force delete.';
  END IF;
  
  IF has_subcategories AND NOT p_force THEN
    RAISE EXCEPTION 'Cannot delete category with subcategories. Delete subcategories first, or use force delete.';
  END IF;
  
  -- Perform soft delete
  UPDATE public.categories
  SET deleted_at = NOW(),
      is_active = false,
      updated_at = NOW()
  WHERE id = p_category_id;
  
  -- If force delete, also soft delete subcategories
  IF p_force AND has_subcategories THEN
    UPDATE public.categories
    SET deleted_at = NOW(),
        is_active = false,
        updated_at = NOW()
    WHERE parent_id = p_category_id AND deleted_at IS NULL;
  END IF;
  
  -- Build result
  result := jsonb_build_object(
    'success', true,
    'message', 'Category deleted successfully',
    'had_products', has_products,
    'had_subcategories', has_subcategories
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 6: CATEGORY RETRIEVAL FUNCTIONS
-- ============================================================================

-- Get all categories for a business (flat list)
CREATE OR REPLACE FUNCTION public.get_business_categories(
  p_business_id UUID,
  p_include_deleted BOOLEAN DEFAULT false,
  p_include_inactive BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  name_ur TEXT,
  description TEXT,
  description_ur TEXT,
  parent_id UUID,
  parent_name TEXT,
  image_url TEXT,
  icon_name TEXT,
  slug TEXT,
  sort_order INTEGER,
  is_active BOOLEAN,
  is_locked BOOLEAN,
  depth_level INTEGER,
  path TEXT,
  availability_schedule JSONB,
  product_count BIGINT,
  subcategory_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.name_ur,
    c.description,
    c.description_ur,
    c.parent_id,
    p.name AS parent_name,
    c.image_url,
    c.icon_name,
    c.slug,
    c.sort_order,
    c.is_active,
    c.is_locked,
    c.depth_level,
    c.path,
    c.availability_schedule,
    (
      SELECT COUNT(*) FROM public.menu_items mi
      WHERE mi.category_id = c.id AND mi.is_deleted = false
    ) AS product_count,
    (
      SELECT COUNT(*) FROM public.categories sc
      WHERE sc.parent_id = c.id AND sc.deleted_at IS NULL
    ) AS subcategory_count
  FROM public.categories c
  LEFT JOIN public.categories p ON c.parent_id = p.id
  WHERE c.business_id = p_business_id
    AND (p_include_deleted OR c.deleted_at IS NULL)
    AND (p_include_inactive OR c.is_active = true)
  ORDER BY c.depth_level, c.sort_order, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get category tree (hierarchical structure)
CREATE OR REPLACE FUNCTION public.get_category_tree(
  p_business_id UUID,
  p_parent_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH RECURSIVE category_tree AS (
    -- Base case: root categories
    SELECT 
      c.*,
      0 AS level,
      c.name::TEXT AS full_path
    FROM public.categories c
    WHERE c.business_id = p_business_id
      AND c.parent_id IS NOT DISTINCT FROM p_parent_id
      AND c.deleted_at IS NULL
      AND c.is_active = true
    
    UNION ALL
    
    -- Recursive case: subcategories
    SELECT 
      c.*,
      ct.level + 1,
      ct.full_path || ' > ' || c.name
    FROM public.categories c
    JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.business_id = p_business_id
      AND c.deleted_at IS NULL
      AND c.is_active = true
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'name_ur', name_ur,
      'description', description,
      'image_url', image_url,
      'icon_name', icon_name,
      'slug', slug,
      'sort_order', sort_order,
      'is_active', is_active,
      'is_locked', is_locked,
      'depth_level', depth_level,
      'level', level,
      'full_path', full_path,
      'availability_schedule', availability_schedule,
      'product_count', (SELECT COUNT(*) FROM menu_items WHERE category_id = id AND is_deleted = false)
    )
  ) INTO result
  FROM category_tree
  ORDER BY level, sort_order, name;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get products in category
CREATE OR REPLACE FUNCTION public.get_category_products(
  p_category_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price INTEGER,
  image_url TEXT,
  is_available BOOLEAN,
  is_primary_category BOOLEAN,
  category_specific_price INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id,
    mi.name,
    mi.description,
    mi.price,
    mi.image_url,
    mi.is_available,
    COALESCE(pc.is_primary, true) AS is_primary_category,
    pc.category_specific_price
  FROM public.menu_items mi
  LEFT JOIN public.product_categories pc ON mi.id = pc.product_id AND pc.category_id = p_category_id
  WHERE (mi.category_id = p_category_id OR pc.category_id = p_category_id)
    AND mi.is_deleted = false
  ORDER BY COALESCE(pc.sort_order, 0), mi.name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 7: BULK OPERATIONS
-- ============================================================================

-- Bulk update sort order
CREATE OR REPLACE FUNCTION public.bulk_update_category_sort_order(
  p_business_id UUID,
  p_sort_orders JSONB  -- Array of {id, sort_order}
)
RETURNS INTEGER AS $$
DECLARE
  item JSONB;
  updated_count INTEGER := 0;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_sort_orders)
  LOOP
    UPDATE public.categories
    SET sort_order = (item->>'sort_order')::INTEGER,
        updated_at = NOW()
    WHERE id = (item->>'id')::UUID
      AND business_id = p_business_id
      AND deleted_at IS NULL;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk toggle active status
CREATE OR REPLACE FUNCTION public.bulk_toggle_category_status(
  p_business_id UUID,
  p_category_ids UUID[],
  p_is_active BOOLEAN
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.categories
  SET is_active = p_is_active,
      updated_at = NOW()
  WHERE id = ANY(p_category_ids)
    AND business_id = p_business_id
    AND is_locked = false
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 8: PRODUCT-CATEGORY ASSOCIATION FUNCTIONS
-- ============================================================================

-- Add product to category
CREATE OR REPLACE FUNCTION public.add_product_to_category(
  p_product_id UUID,
  p_category_id UUID,
  p_is_primary BOOLEAN DEFAULT false,
  p_category_specific_price INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  -- Check if association already exists
  SELECT COUNT(*) INTO existing_count
  FROM public.product_categories
  WHERE product_id = p_product_id AND category_id = p_category_id;
  
  IF existing_count > 0 THEN
    -- Update existing
    UPDATE public.product_categories
    SET is_primary = p_is_primary,
        category_specific_price = p_category_specific_price
    WHERE product_id = p_product_id AND category_id = p_category_id;
  ELSE
    -- Insert new
    INSERT INTO public.product_categories (product_id, category_id, is_primary, category_specific_price)
    VALUES (p_product_id, p_category_id, p_is_primary, p_category_specific_price);
  END IF;
  
  -- If setting as primary, unset other primaries
  IF p_is_primary THEN
    UPDATE public.product_categories
    SET is_primary = false
    WHERE product_id = p_product_id 
      AND category_id != p_category_id
      AND is_primary = true;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove product from category
CREATE OR REPLACE FUNCTION public.remove_product_from_category(
  p_product_id UUID,
  p_category_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.product_categories
  WHERE product_id = p_product_id AND category_id = p_category_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 9: AVAILABILITY SCHEDULE FUNCTIONS
-- ============================================================================

-- Check if category is currently available
CREATE OR REPLACE FUNCTION public.is_category_available_now(
  p_category_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  schedule JSONB;
  current_day TEXT;
  current_time TIME;
  day_schedule JSONB;
  start_time TIME;
  end_time TIME;
BEGIN
  -- Get schedule
  SELECT availability_schedule INTO schedule
  FROM public.categories
  WHERE id = p_category_id;
  
  -- If no schedule, always available
  IF schedule IS NULL OR schedule = '{}'::jsonb THEN
    RETURN true;
  END IF;
  
  -- Get current day and time
  current_day := LOWER(TO_CHAR(NOW(), 'Day'));
  current_time := NOW()::TIME;
  
  -- Get day schedule
  day_schedule := schedule->current_day;
  
  -- If no schedule for today, not available
  IF day_schedule IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check time range
  start_time := (day_schedule->>'start')::TIME;
  end_time := (day_schedule->>'end')::TIME;
  
  RETURN current_time BETWEEN start_time AND end_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 10: RLS POLICIES FOR NEW TABLE
-- ============================================================================

-- Enable RLS on product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.product_categories
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.product_categories
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Enable update for authenticated users" ON public.product_categories
  FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Enable delete for authenticated users" ON public.product_categories
  FOR DELETE USING (auth.role() IN ('authenticated', 'service_role'));

-- ============================================================================
-- PART 11: VIEWS FOR CATEGORY MANAGEMENT
-- ============================================================================

-- View: Categories with full hierarchy info
CREATE OR REPLACE VIEW public.categories_with_hierarchy AS
SELECT 
  c.id,
  c.business_id,
  c.name,
  c.name_ur,
  c.description,
  c.description_ur,
  c.parent_id,
  p.name AS parent_name,
  c.image_url,
  c.icon_name,
  c.slug,
  c.sort_order,
  c.is_active,
  c.is_locked,
  c.depth_level,
  c.path,
  c.availability_schedule,
  c.metadata,
  c.created_at,
  c.updated_at,
  c.deleted_at,
  (
    SELECT STRING_AGG(anc.name, ' > ' ORDER BY anc.depth_level)
    FROM categories anc
    WHERE c.path LIKE anc.path || '%'
      AND anc.id != c.id
  ) AS breadcrumb
FROM public.categories c
LEFT JOIN public.categories p ON c.parent_id = p.id
WHERE c.deleted_at IS NULL;

-- View: Category statistics
CREATE OR REPLACE VIEW public.category_statistics AS
SELECT 
  c.id AS category_id,
  c.name AS category_name,
  c.business_id,
  c.depth_level,
  COUNT(DISTINCT mi.id) AS total_products,
  COUNT(DISTINCT CASE WHEN mi.is_available THEN mi.id END) AS available_products,
  COUNT(DISTINCT CASE WHEN mi.is_draft THEN mi.id END) AS draft_products,
  AVG(mi.price) AS avg_price,
  MIN(mi.price) AS min_price,
  MAX(mi.price) AS max_price,
  (
    SELECT COUNT(*) FROM categories sc 
    WHERE sc.parent_id = c.id AND sc.deleted_at IS NULL
  ) AS subcategory_count
FROM public.categories c
LEFT JOIN public.menu_items mi ON mi.category_id = c.id AND mi.is_deleted = false
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name, c.business_id, c.depth_level;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Category Management System Database Setup Complete!' as status;
