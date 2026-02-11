-- 1. Reload Schema Cache (Fixes "column not found" errors)
NOTIFY pgrst, 'reload config';

-- 2. Approve all existing businesses (Fixes "not live" issue)
UPDATE businesses 
SET is_approved = true, 
    is_active = true
WHERE is_approved IS NULL OR is_approved = false;

-- 3. Ensure Promo Banners are publicly visible
ALTER TABLE promo_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Banners" ON promo_banners;
CREATE POLICY "Public Read Banners" ON promo_banners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin All Banners" ON promo_banners;
CREATE POLICY "Admin All Banners" ON promo_banners FOR ALL USING (true);

-- 4. Ensure Businesses are publicly visible
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Businesses" ON businesses;
CREATE POLICY "Public Read Businesses" ON businesses FOR SELECT USING (true);

-- 5. Ensure Menu Items are publicly visible
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Menu Items" ON menu_items;
CREATE POLICY "Public Read Menu Items" ON menu_items FOR SELECT USING (true);
