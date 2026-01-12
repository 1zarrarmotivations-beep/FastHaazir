-- Create business types enum
CREATE TYPE public.business_type AS ENUM ('restaurant', 'bakery', 'grocery', 'shop');

-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('placed', 'preparing', 'on_way', 'delivered', 'cancelled');

-- Create businesses table
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type business_type NOT NULL DEFAULT 'restaurant',
  image TEXT,
  rating DECIMAL(2,1) DEFAULT 4.5,
  eta TEXT DEFAULT '25-35 min',
  distance TEXT DEFAULT '1.0 km',
  category TEXT,
  description TEXT,
  featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create menu items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  image TEXT,
  category TEXT,
  description TEXT,
  is_popular BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create riders table
CREATE TABLE public.riders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  cnic TEXT,
  vehicle_type TEXT DEFAULT 'Bike',
  rating DECIMAL(2,1) DEFAULT 4.5,
  total_trips INTEGER DEFAULT 0,
  is_online BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  current_location_lat DECIMAL(10,7),
  current_location_lng DECIMAL(10,7),
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_phone TEXT,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'placed',
  items JSONB NOT NULL DEFAULT '[]',
  subtotal INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER NOT NULL DEFAULT 150,
  total INTEGER NOT NULL DEFAULT 0,
  delivery_address TEXT,
  delivery_lat DECIMAL(10,7),
  delivery_lng DECIMAL(10,7),
  pickup_address TEXT,
  pickup_lat DECIMAL(10,7),
  pickup_lng DECIMAL(10,7),
  notes TEXT,
  eta TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rider requests table (for assign a rider feature)
CREATE TABLE public.rider_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_phone TEXT,
  rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10,7),
  pickup_lng DECIMAL(10,7),
  dropoff_address TEXT NOT NULL,
  dropoff_lat DECIMAL(10,7),
  dropoff_lng DECIMAL(10,7),
  item_description TEXT,
  item_image TEXT,
  status order_status NOT NULL DEFAULT 'placed',
  total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for businesses (public read)
CREATE POLICY "Businesses are viewable by everyone" 
ON public.businesses FOR SELECT USING (true);

-- RLS Policies for menu_items (public read)
CREATE POLICY "Menu items are viewable by everyone" 
ON public.menu_items FOR SELECT USING (true);

-- RLS Policies for riders (public read for online riders)
CREATE POLICY "Online riders are viewable by everyone" 
ON public.riders FOR SELECT USING (is_active = true);

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = customer_id);

CREATE POLICY "Users can create their own orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);

CREATE POLICY "Users can update their own orders" 
ON public.orders FOR UPDATE 
USING (auth.uid() = customer_id);

-- RLS Policies for rider_requests
CREATE POLICY "Users can view their own rider requests" 
ON public.rider_requests FOR SELECT 
USING (auth.uid() = customer_id);

CREATE POLICY "Users can create rider requests" 
ON public.rider_requests FOR INSERT 
WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);

CREATE POLICY "Users can update their own rider requests" 
ON public.rider_requests FOR UPDATE 
USING (auth.uid() = customer_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_businesses_updated_at
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_riders_updated_at
BEFORE UPDATE ON public.riders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rider_requests_updated_at
BEFORE UPDATE ON public.rider_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();