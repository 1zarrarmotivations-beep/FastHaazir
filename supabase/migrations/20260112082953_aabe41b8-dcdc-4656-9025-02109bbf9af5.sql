-- 1) Add moderation & soft-delete fields required for customer visibility
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- 2) Create a PUBLIC, SAFE, realtime-friendly table that contains ONLY customer-safe fields
CREATE TABLE IF NOT EXISTS public.public_businesses (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  type public.business_type NOT NULL,
  image text NULL,
  rating numeric NULL,
  eta text NULL,
  distance text NULL,
  category text NULL,
  description text NULL,
  featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_approved boolean NOT NULL DEFAULT true,
  deleted_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS (safe for public reads since this table contains no PII)
ALTER TABLE public.public_businesses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'public_businesses'
      AND policyname = 'Public can read businesses'
  ) THEN
    CREATE POLICY "Public can read businesses"
    ON public.public_businesses
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- 3) Keep public.public_businesses in sync with public.businesses via triggers
CREATE OR REPLACE FUNCTION public.sync_public_businesses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.public_businesses WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.public_businesses (
    id,
    name,
    type,
    image,
    rating,
    eta,
    distance,
    category,
    description,
    featured,
    is_active,
    is_approved,
    deleted_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.name,
    NEW.type,
    NEW.image,
    NEW.rating,
    NEW.eta,
    NEW.distance,
    NEW.category,
    NEW.description,
    COALESCE(NEW.featured, false),
    COALESCE(NEW.is_active, true),
    COALESCE(NEW.is_approved, true),
    NEW.deleted_at,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    image = EXCLUDED.image,
    rating = EXCLUDED.rating,
    eta = EXCLUDED.eta,
    distance = EXCLUDED.distance,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    featured = EXCLUDED.featured,
    is_active = EXCLUDED.is_active,
    is_approved = EXCLUDED.is_approved,
    deleted_at = EXCLUDED.deleted_at,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_public_businesses ON public.businesses;
CREATE TRIGGER trg_sync_public_businesses
AFTER INSERT OR UPDATE OR DELETE
ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.sync_public_businesses();

-- 4) Backfill existing businesses into the public table
INSERT INTO public.public_businesses (
  id,
  name,
  type,
  image,
  rating,
  eta,
  distance,
  category,
  description,
  featured,
  is_active,
  is_approved,
  deleted_at,
  updated_at
)
SELECT
  b.id,
  b.name,
  b.type,
  b.image,
  b.rating,
  b.eta,
  b.distance,
  b.category,
  b.description,
  COALESCE(b.featured, false),
  COALESCE(b.is_active, true),
  COALESCE(b.is_approved, true),
  b.deleted_at,
  now()
FROM public.businesses b
ON CONFLICT (id) DO NOTHING;

-- 5) Enable realtime streaming for the tables customers rely on
ALTER PUBLICATION supabase_realtime ADD TABLE public.public_businesses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;