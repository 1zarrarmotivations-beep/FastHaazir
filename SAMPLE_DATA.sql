-- ============================================================================
-- FAST HAAZIR - SAMPLE DATA (Matching Your Table Structure)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- First, let's see what columns exist in your businesses table
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'businesses';

-- ============================================================================
-- 1. FIX: Ensure businesses table has public read access
-- ============================================================================

DROP POLICY IF EXISTS "Businesses are viewable by everyone" ON public.businesses;
CREATE POLICY "Businesses are viewable by everyone" 
ON public.businesses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Menu items are viewable by everyone" ON public.menu_items;
CREATE POLICY "Menu items are viewable by everyone" 
ON public.menu_items FOR SELECT USING (true);

-- ============================================================================
-- 2. ADD MISSING COLUMNS TO BUSINESSES TABLE (if needed)
-- ============================================================================

DO $$
BEGIN
  -- Add type column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'type') THEN
    ALTER TABLE public.businesses ADD COLUMN type TEXT DEFAULT 'restaurant';
  END IF;
  
  -- Add rating column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'rating') THEN
    ALTER TABLE public.businesses ADD COLUMN rating DECIMAL(2,1) DEFAULT 4.5;
  END IF;
  
  -- Add eta column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'eta') THEN
    ALTER TABLE public.businesses ADD COLUMN eta TEXT DEFAULT '25-35 min';
  END IF;
  
  -- Add distance column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'distance') THEN
    ALTER TABLE public.businesses ADD COLUMN distance TEXT DEFAULT '1.0 km';
  END IF;
  
  -- Add category column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'category') THEN
    ALTER TABLE public.businesses ADD COLUMN category TEXT;
  END IF;
  
  -- Add description column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'description') THEN
    ALTER TABLE public.businesses ADD COLUMN description TEXT;
  END IF;
  
  -- Add featured column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'featured') THEN
    ALTER TABLE public.businesses ADD COLUMN featured BOOLEAN DEFAULT false;
  END IF;
  
  -- Add is_active column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'is_active') THEN
    ALTER TABLE public.businesses ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  
  -- Add address column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'address') THEN
    ALTER TABLE public.businesses ADD COLUMN address TEXT;
  END IF;
  
  -- Add latitude column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'latitude') THEN
    ALTER TABLE public.businesses ADD COLUMN latitude DECIMAL(10,7);
  END IF;
  
  -- Add longitude column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'longitude') THEN
    ALTER TABLE public.businesses ADD COLUMN longitude DECIMAL(10,7);
  END IF;
END $$;

-- ============================================================================
-- 3. SAMPLE BUSINESSES DATA
-- ============================================================================

INSERT INTO public.businesses (name, type, image, rating, eta, distance, category, description, featured, is_active, address, latitude, longitude)
VALUES 
  ('Pizza Palace', 'restaurant', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', 4.5, '25-35 min', '1.2 km', 'Pizza', 'Best pizza in town', true, true, 'Main Boulevard, Quetta', 30.1798, 66.9750),
  
  ('Burger King Quetta', 'restaurant', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', 4.3, '20-30 min', '0.8 km', 'Burgers', 'Juicy burgers and crispy fries', true, true, 'Jinnah Road, Quetta', 30.1820, 66.9780),
  
  ('Biryani House', 'restaurant', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', 4.7, '30-40 min', '2.0 km', 'Biryani', 'Authentic Hyderabadi biryani', true, true, 'Zarghoon Road, Quetta', 30.1750, 66.9800),
  
  ('Al-Noor Bakery', 'bakery', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', 4.4, '15-25 min', '0.5 km', 'Bakery', 'Fresh bread and pastries', false, true, 'Samungli Road, Quetta', 30.1780, 66.9720),
  
  ('Fresh Mart', 'grocery', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400', 4.2, '20-30 min', '1.5 km', 'Grocery', 'Daily essentials delivered', false, true, 'Airport Road, Quetta', 30.1900, 66.9650),
  
  ('Karahi Corner', 'restaurant', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400', 4.6, '35-45 min', '1.8 km', 'Karahi', 'Famous mutton karahi', true, true, 'Brewery Road, Quetta', 30.1850, 66.9850),
  
  ('Chapli Kabab House', 'restaurant', 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400', 4.8, '25-35 min', '1.0 km', 'BBQ', 'Best Chapli Kababs', true, true, 'Liaquat Bazaar, Quetta', 30.1830, 66.9730),
  
  ('Shawarma Express', 'restaurant', 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400', 4.1, '15-20 min', '0.6 km', 'Shawarma', 'Middle Eastern flavors', false, true, 'MA Jinnah Road, Quetta', 30.1810, 66.9760),
  
  ('Chai Wala', 'restaurant', 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400', 4.0, '10-15 min', '0.3 km', 'Cafe', 'Desi chai with parathas', false, true, 'Satellite Town, Quetta', 30.1760, 66.9690),
  
  ('Sweet Paradise', 'bakery', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', 4.5, '20-30 min', '1.3 km', 'Sweets', 'Traditional Pakistani sweets', false, true, 'Kandahari Bazaar, Quetta', 30.1770, 66.9810);

-- ============================================================================
-- 4. SAMPLE MENU ITEMS
-- ============================================================================

DO $$
DECLARE
  pizza_id UUID;
  burger_id UUID;
  biryani_id UUID;
BEGIN
  SELECT id INTO pizza_id FROM public.businesses WHERE name = 'Pizza Palace' LIMIT 1;
  SELECT id INTO burger_id FROM public.businesses WHERE name = 'Burger King Quetta' LIMIT 1;
  SELECT id INTO biryani_id FROM public.businesses WHERE name = 'Biryani House' LIMIT 1;
  
  IF pizza_id IS NOT NULL THEN
    INSERT INTO public.menu_items (business_id, name, price, image, category, description, is_popular, is_available)
    VALUES 
      (pizza_id, 'Pepperoni Pizza', 1200, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400', 'Pizza', 'Classic pepperoni', true, true),
      (pizza_id, 'Chicken Fajita Pizza', 1100, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', 'Pizza', 'Loaded with chicken', true, true),
      (pizza_id, 'Margherita', 900, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', 'Pizza', 'Simple and delicious', false, true),
      (pizza_id, 'Garlic Bread', 350, 'https://images.unsplash.com/photo-1619535860434-ba1d8fa68e12?w=400', 'Sides', 'Crispy garlic bread', false, true);
  END IF;
  
  IF burger_id IS NOT NULL THEN
    INSERT INTO public.menu_items (business_id, name, price, image, category, description, is_popular, is_available)
    VALUES 
      (burger_id, 'Zinger Burger', 550, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', 'Burgers', 'Crispy zinger', true, true),
      (burger_id, 'Beef Burger', 650, 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400', 'Burgers', 'Juicy beef patty', true, true),
      (burger_id, 'French Fries', 200, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', 'Sides', 'Crispy golden fries', false, true);
  END IF;
  
  IF biryani_id IS NOT NULL THEN
    INSERT INTO public.menu_items (business_id, name, price, image, category, description, is_popular, is_available)
    VALUES 
      (biryani_id, 'Chicken Biryani', 350, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', 'Biryani', 'Aromatic chicken biryani', true, true),
      (biryani_id, 'Mutton Biryani', 550, 'https://images.unsplash.com/photo-1642821373181-696a54913e93?w=400', 'Biryani', 'Premium mutton biryani', true, true),
      (biryani_id, 'Raita', 50, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400', 'Sides', 'Fresh yogurt raita', false, true);
  END IF;
END $$;

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT 'Success! ' || COUNT(*) || ' businesses created.' as result FROM public.businesses;
