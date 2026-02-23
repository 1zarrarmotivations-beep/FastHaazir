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

  const selectedCategoryData = categories?.find(c => c.id === selectedCategory);
  const isMedicineSelected = selectedCategoryData?.name?.toLowerCase() === 'medicine';

  const filteredProducts = products?.filter(p => {
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
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary/80 mb-0.5">
                <MapPin size={10} className="text-primary" /> {t('grocery.deliveringTo')}
              </div>
              <button
                onClick={() => setShowAddressSelector(true)}
                className="text-sm font-black flex items-center gap-1.5 hover:text-primary transition-all active:scale-95 group"
              >
                <span className="truncate max-w-[180px]">{userLocation?.address || t('grocery.selectLocation')}</span>
                <ChevronRight size={14} className="text-primary group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative rounded-2xl bg-muted/40 hover:bg-muted/60 transition-all border border-border/20">
              <Bell size={20} className="text-foreground/70" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-surface shadow-[0_0_8px_rgba(255,106,0,0.5)]" />
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

        {/* Delivery Info Strip */}
        {settings && (
          <div className="flex items-center gap-4 mt-4 px-2 py-2 bg-muted/30 rounded-2xl border border-border/20 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck size={12} className="text-primary" />
              </div>
              <span className="text-[10px] whitespace-nowrap">
                {isOutsideDeliveryZone ? (
                  <span className="text-amber-600 font-black uppercase tracking-tighter">{t('grocery.unavailable')}</span>
                ) : (
                  <span className="font-black text-foreground">
                    {deliveryFee === 0 ? t('grocery.freeDelivery') : `PKR ${deliveryFee} fee`}
                  </span>
                )}
              </span>
            </div>

            <div className="w-px h-3 bg-border/50 flex-shrink-0" />

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                <ShoppingBag size={12} className="text-success" />
              </div>
              <span className="text-[10px] font-black whitespace-nowrap">
                MIN: PKR {settings.min_order_value || 0}
              </span>
            </div>

            <div className="w-px h-3 bg-border/50 flex-shrink-0 ml-auto" />

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-success">Active</span>
            </div>
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
      <div className="space-y-8 mt-2 pb-12">
        {/* Quick Actions / Categories Horizontal Scroll */}
        <section className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(255,106,0,0.5)]" />
              {t('grocery.shopByStore')}
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex flex-col items-center gap-2.5 flex-shrink-0 group outline-none"
            >
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center p-3 transition-all duration-300 relative ${!selectedCategory ? 'bg-primary shadow-xl shadow-primary/30 ring-4 ring-primary/20 scale-105' : 'bg-muted/40 hover:bg-muted opacity-90'}`}>
                <Sparkles className={`w-8 h-8 ${!selectedCategory ? 'text-white' : 'text-primary/70'}`} />
                {!selectedCategory && <motion.div layoutId="cat-glow" className="absolute inset-0 rounded-3xl bg-primary animate-pulse blur-xl opacity-30 -z-10" />}
              </div>
              <span className={`text-[10px] font-black tracking-widest uppercase ${!selectedCategory ? 'text-primary' : 'text-muted-foreground/80'}`}>{t('grocery.all')}</span>
            </button>

            {categories?.filter(c => c.is_active).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="flex flex-col items-center gap-2.5 flex-shrink-0 group outline-none"
              >
                <div
                  className={`w-16 h-16 rounded-3xl flex items-center justify-center p-3 transition-all duration-500 relative ${selectedCategory === cat.id
                    ? 'bg-primary shadow-xl shadow-primary/30 ring-4 ring-primary/20 scale-105'
                    : 'bg-muted/40 hover:bg-muted opacity-90 hover:scale-105'
                    }`}
                >
                  {cat.icon_url || cat.image_url ? (
                    <img
                      src={cat.icon_url || cat.image_url}
                      alt={cat.name}
                      className={`w-10 h-10 object-contain transition-all duration-300 ${selectedCategory === cat.id ? 'brightness-0 invert' : ''}`}
                    />
                  ) : (
                    <span className="text-3xl leading-none">
                      {cat.name.toLowerCase() === 'medicine' ? '💊' :
                        cat.name.toLowerCase().includes('fruit') ? '🍎' :
                          cat.name.toLowerCase().includes('vegetable') ? '🥦' :
                            cat.name.toLowerCase().includes('meat') ? '🥩' :
                              cat.name.toLowerCase().includes('dairy') ? '🥛' : '📦'}
                    </span>
                  )}
                  {selectedCategory === cat.id && <motion.div layoutId="cat-glow" className="absolute inset-0 rounded-3xl bg-primary animate-pulse blur-xl opacity-30 -z-10" />}
                </div>
                <span className={`text-[10px] font-black tracking-widest uppercase line-clamp-1 max-w-[64px] ${selectedCategory === cat.id ? 'text-primary' : 'text-muted-foreground/80'}`}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Promo Banner - Large and Premium */}
        <section className="px-4">
          <div className="rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary/10 border border-border/50 bg-muted/20">
            <BannerCarousel type="grocery" />
          </div>
        </section>

        {/* Exclusive Deals Strip */}
        {trendingProducts && trendingProducts.length > 0 && !selectedCategory && !searchQuery && (
          <section className="px-0 relative overflow-hidden py-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />
            <div className="px-4 flex items-center justify-between mb-4">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Tag size={20} className="text-primary" />
                {t('grocery.hotDeals')}
              </h2>
              <div className="flex gap-1.5">
                <Badge variant="outline" className="rounded-full border-primary/20 text-primary bg-primary/5 uppercase text-[9px] font-black tracking-widest px-3 py-1">Limited Time</Badge>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 pb-4">
              {trendingProducts.map(p => (
                <div key={p.id} className="min-w-[200px] max-w-[200px]">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Featured Section - 2x2 Grid */}
        {featuredProducts && featuredProducts.length > 0 && !selectedCategory && !searchQuery && (
          <section className="px-4">
            <div className="flex items-center justify-between mb-5">
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-2 leading-none">
                  {t('grocery.essentialPicks')}
                </h2>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{t('grocery.curatedForYou')}</p>
              </div>
              <Button variant="link" size="sm" className="text-primary font-black uppercase text-[10px] tracking-widest h-auto p-0">{t('grocery.viewAll')}</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {featuredProducts.slice(0, 4).map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Category Focus: Fresh Veggies & Fruits (Example) */}
        {!selectedCategory && !searchQuery && categories?.find(c => c.name.toLowerCase().includes('fruit') || c.name.toLowerCase().includes('veg')) && (
          <section className="px-4">
            <div className="bg-success/5 border border-success/10 rounded-[2.5rem] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-success/20 flex items-center justify-center">
                    <Store size={20} className="text-success" />
                  </div>
                  <h3 className="font-black text-lg tracking-tight">{t('grocery.freshFarmDirect')}</h3>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {products?.filter(p => p.category?.name.toLowerCase().includes('fruit') || p.category?.name.toLowerCase().includes('veg')).slice(0, 5).map(p => (
                  <div key={p.id} className="min-w-[160px]">
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Grid of Results / All Products */}
        <section className="px-4 pb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black flex items-center gap-2">
              <div className="w-1.5 h-6 bg-success rounded-full" />
              {isMedicineSelected ? (
                <span className="flex items-center gap-2">💊 {t('grocery.medicine')}</span>
              ) : selectedCategory ? (
                categories?.find(c => c.id === selectedCategory)?.name
              ) : (
                t('grocery.allProducts')
              )}
            </h2>
            {searchQuery && (
              <Badge variant="secondary" className="rounded-full font-black text-[10px]">
                {filteredProducts?.length || 0} {t('grocery.found')}
              </Badge>
            )}
          </div>

          {catsLoading || prodsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-[2rem]" />)}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {filteredProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/20 border-2 border-dashed border-border/50 rounded-[3rem] flex flex-col items-center">
              <div className="w-20 h-20 bg-muted/40 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag size={40} className="text-muted-foreground/30" />
              </div>
              <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">{t('grocery.noItemsMatch')}</p>
              {searchQuery && (
                <Button
                  variant="link"
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-primary font-bold"
                >
                  {t('grocery.tryAdjusting')}
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
