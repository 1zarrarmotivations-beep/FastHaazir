import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  ChevronRight,
  ShoppingBag,
  Bell,
  Sparkles,
  TrendingUp,
  Tag,
  ArrowLeft,
  X,
  Navigation,
  AlertTriangle,
  Store,
  Truck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGroceryCategories, useGroceryProducts, useGrocerySettings } from "@/hooks/useGroceryAdmin";
import { useGroceryCart } from "@/context/GroceryCartContext";
import { useCustomerAddresses, useDefaultAddress, CustomerAddress } from "@/hooks/useCustomerAddresses";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import ProductCard from "@/components/grocery/ProductCard";
import BannerCarousel from "@/components/customer/BannerCarousel";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import AddressSelector from "@/components/profile/AddressSelector";
import OpenStreetMapPicker from "@/components/profile/OpenStreetMapPicker";

interface UserLocation {
  lat: number;
  lng: number;
  address: string;
}

// Default location (Quetta)
const DEFAULT_LOCATION = { lat: 30.1798, lng: 66.975 };

// Medicine category sentinel ID (used for hardcoded fallback items)
const MEDICINE_CATEGORY_ID = '__medicine__';

// Hardcoded medicine items (fallback if DB not seeded)
const MEDICINE_ITEMS = [
  {
    id: 'med-001',
    name: 'Panadol Extra',
    description: 'Pain relief tablet',
    base_price: 150,
    discount_price: null,
    pricing_type: 'per_piece' as const,
    min_quantity: 1,
    max_quantity: 50,
    stock_quantity: 100,
    is_visible: true,
    is_featured: false,
    is_trending: false,
    category_id: MEDICINE_CATEGORY_ID,
    image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'med-002',
    name: 'Brufen 400mg',
    description: 'Anti-inflammatory tablet',
    base_price: 120,
    discount_price: null,
    pricing_type: 'per_piece' as const,
    min_quantity: 1,
    max_quantity: 50,
    stock_quantity: 100,
    is_visible: true,
    is_featured: false,
    is_trending: false,
    category_id: MEDICINE_CATEGORY_ID,
    image_url: 'https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'med-003',
    name: 'Disprin',
    description: 'Aspirin tablet',
    base_price: 80,
    discount_price: null,
    pricing_type: 'per_piece' as const,
    min_quantity: 1,
    max_quantity: 50,
    stock_quantity: 100,
    is_visible: true,
    is_featured: false,
    is_trending: false,
    category_id: MEDICINE_CATEGORY_ID,
    image_url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'med-004',
    name: 'Cough Syrup',
    description: 'Cold & flu relief',
    base_price: 250,
    discount_price: null,
    pricing_type: 'per_piece' as const,
    min_quantity: 1,
    max_quantity: 20,
    stock_quantity: 50,
    is_visible: true,
    is_featured: false,
    is_trending: false,
    category_id: MEDICINE_CATEGORY_ID,
    image_url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'med-005',
    name: 'ORS Powder',
    description: 'Oral rehydration salts',
    base_price: 50,
    discount_price: null,
    pricing_type: 'per_piece' as const,
    min_quantity: 1,
    max_quantity: 100,
    stock_quantity: 200,
    is_visible: true,
    is_featured: false,
    is_trending: false,
    category_id: MEDICINE_CATEGORY_ID,
    image_url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=400',
  },
];

// Delivery zone center (Quetta)
const DELIVERY_ZONE_CENTER = { lat: 30.1798, lng: 66.975 };
const DELIVERY_RADIUS_KM = 15; // 15km radius

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function Grocery() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isOutsideDeliveryZone, setIsOutsideDeliveryZone] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const { data: categories, isLoading: catsLoading } = useGroceryCategories();
  const { data: products, isLoading: prodsLoading } = useGroceryProducts();
  const { data: settings } = useGrocerySettings();
  const { data: savedAddresses = [] } = useCustomerAddresses();
  const { data: defaultAddress } = useDefaultAddress();
  const { totalItems, subtotal, minOrderValue, deliveryFee, setDeliveryFee, setMinOrderValue } = useGroceryCart();

  // Address picker states
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined);

  // Initialize settings from database
  useEffect(() => {
    if (settings) {
      if (settings.min_order_value) {
        setMinOrderValue(settings.min_order_value);
      }
      if (settings.delivery_fee) {
        setDeliveryFee(settings.delivery_fee);
      }
    }
  }, [settings, setMinOrderValue, setDeliveryFee]);

  // Initialize user location from saved addresses
  useEffect(() => {
    if (defaultAddress && defaultAddress.lat && defaultAddress.lng) {
      setUserLocation({
        lat: defaultAddress.lat,
        lng: defaultAddress.lng,
        address: defaultAddress.address_text
      });
    } else if (savedAddresses.length > 0) {
      const firstAddr = savedAddresses[0];
      if (firstAddr.lat && firstAddr.lng) {
        setUserLocation({
          lat: firstAddr.lat,
          lng: firstAddr.lng,
          address: firstAddr.address_text
        });
      }
    }
  }, [defaultAddress, savedAddresses]);

  // Check delivery zone whenever location changes
  useEffect(() => {
    if (userLocation?.lat && userLocation?.lng) {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        DELIVERY_ZONE_CENTER.lat,
        DELIVERY_ZONE_CENTER.lng
      );
      setIsOutsideDeliveryZone(distance > DELIVERY_RADIUS_KM);
    }
  }, [userLocation]);

  // Get current location using Geolocation API
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;

        // Try to get address from coordinates
        try {
          // Using a simple reverse geocode approach
          const address = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          setUserLocation({ lat, lng, address });
          toast.success("Location updated!");
        } catch (error) {
          console.error("Error getting address:", error);
          setUserLocation({ lat, lng, address: "Current Location" });
        }
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error(t('grocery.couldNotGetLocation'));
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Handle address selection from saved addresses
  const handleSelectAddress = (address: CustomerAddress) => {
    if (address && address.lat && address.lng) {
      setUserLocation({
        lat: address.lat,
        lng: address.lng,
        address: address.address_text
      });
      setSelectedAddressId(address.id);
      setShowAddressSelector(false);
    }
  };

  // Handle map location selection
  const handleMapLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setUserLocation(location);
    setSelectedAddressId(undefined);
    setShowMapPicker(false);
    toast.success(t('grocery.deliveryLocationUpdated'));
  };

  // Combine DB products with medicine fallback items
  const isMedicineSelected = selectedCategory === MEDICINE_CATEGORY_ID;

  const filteredProducts = isMedicineSelected
    ? MEDICINE_ITEMS.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : products?.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory ? p.category_id === selectedCategory : true;
      return matchesSearch && matchesCat && p.is_visible;
    });

  const featuredProducts = products?.filter(p => p.is_featured && p.is_visible);
  const trendingProducts = products?.filter(p => p.is_trending && p.is_visible);

  // Calculate remaining amount for min order
  const remainingForMinOrder = Math.max(0, minOrderValue - subtotal);

  return (
    <div className="mobile-container bg-surface min-h-screen pb-32">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-[100] bg-surface/90 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-muted/50"
              onClick={() => navigate("/")}
            >
              <ArrowLeft size={18} />
            </Button>
            <div>
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter text-primary">
                <MapPin size={10} /> {t('grocery.deliveringTo')}
              </div>
              <button
                onClick={() => setShowAddressSelector(true)}
                className="text-sm font-bold flex items-center gap-1 hover:text-primary transition-colors text-left"
              >
                {userLocation?.address || t('grocery.selectLocation')}
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative rounded-xl bg-muted/30">
              <Bell size={20} />
              <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-surface" />
            </Button>
          </div>
        </div>

        {/* Premium Search */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search size={18} />
          </div>
          <Input
            placeholder={t('grocery.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-muted/50 border-none rounded-2xl text-base shadow-inner pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Delivery Fee Display */}
        {settings && (
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <Truck size={14} className="text-primary" />
            <span>
              {isOutsideDeliveryZone ? (
                <span className="text-amber-600 font-medium">{t('grocery.deliveryMayNotBeAvailable')}</span>
              ) : (
                <>
                  <span className="font-semibold text-foreground">{t('grocery.delivery')}: </span>
                  {deliveryFee === 0 ? (
                    <span className="text-green-600 font-semibold">{t('grocery.free')}</span>
                  ) : (
                    <span>PKR {deliveryFee}</span>
                  )}
                </>
              )}
            </span>
            {settings.min_order_value && (
              <span className="ml-auto">
                {t('grocery.minOrder')}: PKR {settings.min_order_value}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Outside Delivery Zone Warning */}
      <AnimatePresence>
        {isOutsideDeliveryZone && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pt-3"
          >
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  {t('grocery.outsideDeliveryZone')}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  {t('grocery.deliveryMayNotBeAvailable')}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="space-y-6 mt-4">
        {/* Categories Grid - Prominent and Clean */}
        <section className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              {t('grocery.categories')}
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-y-6 gap-x-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center p-3 transition-all duration-300 ${!selectedCategory ? 'bg-primary shadow-xl shadow-primary/30 ring-4 ring-primary/20' : 'bg-muted/50 group-hover:bg-muted opacity-80'}`}>
                <Sparkles className={`w-8 h-8 ${!selectedCategory ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <span className={`text-[11px] font-black tracking-tight truncate w-full text-center ${!selectedCategory ? 'text-primary' : 'text-muted-foreground'}`}>{t('grocery.allItems')}</span>
            </button>

            {categories?.filter(c => c.is_active).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  className={`w-16 h-16 rounded-3xl flex items-center justify-center p-3 transition-all duration-300 ${selectedCategory === cat.id
                    ? 'bg-primary shadow-xl shadow-primary/30 ring-4 ring-primary/20'
                    : 'bg-muted/50 group-hover:bg-muted opacity-80'
                    }`}
                >
                  <img
                    src={cat.icon_url || ''}
                    alt={cat.name}
                    className={`w-10 h-10 object-contain transition-all ${selectedCategory === cat.id ? 'brightness-0 invert' : ''}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3081/3081840.png";
                    }}
                  />
                </div>
                <span className={`text-[10px] font-black tracking-tight leading-tight w-full text-center px-0.5 line-clamp-2 ${selectedCategory === cat.id ? 'text-primary' : 'text-muted-foreground'}`}>
                  {cat.name}
                </span>
              </button>
            ))}

            {/* Medicine Category - Hardcoded */}
            <button
              onClick={() => setSelectedCategory(MEDICINE_CATEGORY_ID)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className={`w-16 h-16 rounded-3xl flex items-center justify-center p-3 transition-all duration-300 ${selectedCategory === MEDICINE_CATEGORY_ID
                  ? 'bg-primary shadow-xl shadow-primary/30 ring-4 ring-primary/20'
                  : 'bg-muted/50 group-hover:bg-muted opacity-80'
                  }`}
              >
                <span className="text-3xl leading-none">💊</span>
              </div>
              <span className={`text-[10px] font-black tracking-tight leading-tight w-full text-center px-0.5 line-clamp-2 ${selectedCategory === MEDICINE_CATEGORY_ID ? 'text-primary' : 'text-muted-foreground'}`}>
                {t('grocery.medicine')}
              </span>
            </button>
          </div>
        </section>

        {/* Promo Banner - integrated */}
        <section className="px-3">
          <div className="rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary/10 border border-border/50">
            <BannerCarousel type="grocery" />
          </div>
        </section>

        {/* Featured Section */}
        {featuredProducts && featuredProducts.length > 0 && !selectedCategory && !searchQuery && (
          <section className="px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                {t('grocery.premiumDeals')}
              </h2>
              <Badge variant="outline" className="rounded-full font-bold border-amber-500/20 text-amber-600 bg-amber-500/5 px-3 py-1">{t('grocery.bestValue')}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {featuredProducts.slice(0, 4).map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* All Products */}
        <section className="px-4 pb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black flex items-center gap-2">
              {isMedicineSelected ? (
                <span className="text-xl leading-none">💊</span>
              ) : (
                <TrendingUp size={18} className="text-success" />
              )}
              {isMedicineSelected
                ? t('grocery.medicine')
                : selectedCategory
                  ? categories?.find(c => c.id === selectedCategory)?.name
                  : t('grocery.freshForYou')}
            </h2>
            {searchQuery && (
              <Badge variant="secondary" className="rounded-full">
                {filteredProducts?.length || 0} {t('grocery.results')}
              </Badge>
            )}
          </div>

          {catsLoading || prodsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {filteredProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-3xl border border-dashed border-border flex flex-col items-center">
              <ShoppingBag size={48} className="text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground font-medium">{t('grocery.noProductsFound')}</p>
              {searchQuery && (
                <Button
                  variant="link"
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-primary"
                >
                  {t('grocery.clearSearch')}
                </Button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Floating Cart Indicator - Improved */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 z-[200]"
          >
            <button
              onClick={() => navigate("/grocery/cart")}
              className="w-full bg-primary hover:bg-primary/90 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between transition-all active:scale-95 border-b-4 border-black/20"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2 rounded-xl relative">
                  <ShoppingBag size={20} />
                  <span className="absolute -top-1 -right-1 bg-white text-primary text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{t('grocery.viewBasket')}</p>
                  <p className="text-lg font-black leading-none">PKR {subtotal.toFixed(0)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {subtotal < minOrderValue ? (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold bg-black/10 px-2 py-1 rounded-lg">
                      PKR {remainingForMinOrder} {t('grocery.away')}
                    </span>
                    <span className="text-[8px] text-white/60">{t('grocery.minOrder')}: PKR {minOrderValue}</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-lg">
                    ✓ {t('grocery.ready')}
                  </span>
                )}
                <ChevronRight size={20} />
              </div>
            </button>

            {/* Progress Bar */}
            {subtotal < minOrderValue && (
              <div className="mt-2 bg-white/20 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(subtotal / minOrderValue) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Address Picker Modal */}
      <AnimatePresence>
        {showAddressPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/50"
            onClick={() => setShowAddressPicker(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl max-h-[70vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black">{t('grocery.selectDeliveryLocation')}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAddressPicker(false)}
                    className="rounded-full"
                  >
                    <X size={20} />
                  </Button>
                </div>
              </div>

              {/* Current Location Option */}
              <div className="p-4 border-b border-border">
                <button
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation}
                  className="w-full flex items-center gap-3 p-3 bg-primary/10 hover:bg-primary/20 rounded-2xl transition-colors disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    {isGettingLocation ? (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Navigation className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">{t('grocery.useCurrentLocation')}</p>
                    <p className="text-xs text-muted-foreground">{t('grocery.getYourGPSLocation')}</p>
                  </div>
                </button>
              </div>

              {/* Saved Addresses */}
              {savedAddresses.length > 0 && (
                <div className="p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {t('grocery.savedAddresses')}
                  </h4>
                  <div className="space-y-2">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        onClick={() => handleSelectAddress(addr)}
                        className={`w-full flex items-start gap-3 p-3 rounded-2xl transition-colors text-left ${userLocation?.address === addr.address_text
                          ? 'bg-primary/10 ring-2 ring-primary'
                          : 'hover:bg-muted'
                          }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${userLocation?.address === addr.address_text
                          ? 'bg-primary text-white'
                          : 'bg-muted'
                          }`}>
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{addr.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{addr.address_text}</p>
                          {addr.is_default && (
                            <Badge variant="secondary" className="mt-1 text-[10px] h-5">{t('grocery.default')}</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No Addresses */}
              {savedAddresses.length === 0 && user && (
                <div className="p-4 text-center">
                  <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">{t('grocery.noSavedAddresses')}</p>
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                      setShowAddressPicker(false);
                      navigate('/profile/addresses');
                    }}
                  >
                    {t('grocery.addNewAddress')}
                  </Button>
                </div>
              )}

              {/* Login Prompt */}
              {!user && (
                <div className="p-4 text-center">
                  <p className="text-muted-foreground text-sm mb-3">{t('grocery.loginToSaveAddresses')}</p>
                  <Button
                    onClick={() => {
                      setShowAddressPicker(false);
                      navigate('/auth');
                    }}
                  >
                    {t('grocery.login')}
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />

      {/* Address Selector Modal */}
      <AddressSelector
        open={showAddressSelector}
        onOpenChange={setShowAddressSelector}
        selectedAddressId={selectedAddressId}
        onSelect={handleSelectAddress}
        onAddNew={() => {
          setShowAddressSelector(false);
          setShowMapPicker(true);
        }}
      />

      {/* Map Picker */}
      {showMapPicker && (
        <OpenStreetMapPicker
          onSelect={handleMapLocationSelect}
          onBack={() => setShowMapPicker(false)}
          initialLocation={userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : undefined}
        />
      )}
    </div>
  );
}
