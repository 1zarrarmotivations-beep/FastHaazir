import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  ChevronRight,
  ShoppingBag,
  Bell,
  Sparkles,
  Tag,
  ArrowLeft,
  X,
  Navigation,
  AlertTriangle,
  Store,
  Truck,
  Clock,
  Flame,
  Zap,
  Filter,
  SlidersHorizontal,
  Grid3X3,
  List,
  Star,
  Eye,
  Heart,
  ShoppingCart,
  Package
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGroceryCategories, useGroceryProducts, useGrocerySettings, useGroceryFlashSales, useRecentlyViewedProducts, useAddRecentlyViewed } from "@/hooks/useGroceryAdmin";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGroceryProductReviews, useProductRatingSummary, useSubmitGroceryReview } from "@/hooks/useGroceryAdmin";

interface UserLocation {
  lat: number;
  lng: number;
  address: string;
}

// Default location (Quetta)
const DEFAULT_LOCATION = { lat: 30.1798, lng: 66.975 };

// Delivery zone center (Quetta)
const DELIVERY_ZONE_CENTER = { lat: 30.1798, lng: 66.975 };
const DELIVERY_RADIUS_KM = 15;

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

// Category icons mapping
const CATEGORY_ICONS: Record<string, string> = {
  'fruits': '🍎',
  'vegetable': '🥦',
  'meat': '🥩',
  'poultry': '🍗',
  'dairy': '🥛',
  'egg': '🥚',
  'bakery': '🥐',
  'bread': '🍞',
  'beverage': '🧃',
  'drink': '🥤',
  'snack': '🍿',
  'chip': '🥔',
  'household': '🧹',
  'cleaning': '🧽',
  'personal': '🧴',
  'baby': '👶',
  'frozen': '🧊',
  'medicine': '💊',
  'health': '💊',
  'oil': '🫗',
  'rice': '🍚',
  'atta': '🌾',
  'flour': '🌾',
  'spice': '🧂',
  ' condiment': '🧂',
};

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '📦';
}

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc' | 'rating'>('name');

  // Product quick view
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);

  const { data: categories, isLoading: catsLoading } = useGroceryCategories();
  const { data: products, isLoading: prodsLoading } = useGroceryProducts();
  const { data: settings } = useGrocerySettings();
  const { data: flashSales } = useGroceryFlashSales();
  const { data: recentlyViewed } = useRecentlyViewedProducts();
  const addRecentlyViewed = useAddRecentlyViewed();
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
        const address = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        setUserLocation({ lat, lng, address });
        toast.success("Location updated!");
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

  // Filter and sort products
  const filteredProducts = products?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory ? p.category_id === selectedCategory : true;
    const matchesPrice = (p.discount_price || p.base_price) >= priceRange[0] &&
      (p.discount_price || p.base_price) <= priceRange[1];
    return matchesSearch && matchesCat && matchesPrice && p.is_visible;
  });

  // Sort products
  const sortedProducts = [...(filteredProducts || [])].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return (a.discount_price || a.base_price) - (b.discount_price || b.base_price);
      case 'price_desc':
        return (b.discount_price || b.base_price) - (a.discount_price || a.base_price);
      case 'rating':
        return 0; // Would need to sort by rating summary
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const featuredProducts = products?.filter(p => p.is_featured && p.is_visible);
  const trendingProducts = products?.filter(p => p.is_trending && p.is_visible);

  // Calculate remaining amount for min order
  const remainingForMinOrder = Math.max(0, minOrderValue - subtotal);

  // Handle product click - show detail modal
  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
    // Track view
    if (user) {
      addRecentlyViewed.mutate(product.id);
    }
  };

  return (
    <div className="mobile-container bg-gradient-to-b from-surface to-surface/95 min-h-screen pb-32">
      {/* Premium Header with Gradient */}
      <header className="sticky top-0 z-[100] bg-gradient-to-b from-surface/95 to-surface/90 backdrop-blur-xl border-b border-border/30 px-4 pt-4 pb-3">
        {/* Top Row - Location & Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-muted/50 shrink-0"
              onClick={() => navigate("/")}
            >
              <ArrowLeft size={18} />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary/80 mb-0.5">
                <MapPin size={10} className="text-primary shrink-0" />
                <span className="truncate">{t('grocery.deliveringTo')}</span>
              </div>
              <button
                onClick={() => setShowAddressSelector(true)}
                className="text-sm font-black flex items-center gap-1.5 hover:text-primary transition-all active:scale-95 group text-left w-full"
              >
                <span className="truncate">{userLocation?.address || t('grocery.selectLocation')}</span>
                <ChevronRight size={14} className="text-primary group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <Button variant="ghost" size="icon" className="relative rounded-2xl bg-muted/40 hover:bg-muted/60 transition-all border border-border/20">
              <Bell size={20} className="text-foreground/70" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-surface shadow-[0_0_8px_rgba(255,106,0,0.5)]" />
            </Button>
          </div>
        </div>

        {/* Search Bar - Premium Style */}
        <div className="relative mb-4">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search size={18} />
          </div>
          <Input
            placeholder={t('grocery.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-white dark:bg-muted/50 border-none rounded-2xl text-base shadow-lg shadow-primary/5 pr-10"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>

        {/* Delivery Info Strip - Horizontal Scroll */}
        {settings && (
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-2xl flex-shrink-0">
              <Truck size={14} className="text-primary" />
              <span className="text-[10px] font-black whitespace-nowrap">
                {isOutsideDeliveryZone ? (
                  <span className="text-amber-600">{t('grocery.unavailable')}</span>
                ) : deliveryFee === 0 ? (
                  <span className="text-success">{t('grocery.freeDelivery')}</span>
                ) : (
                  <span>PKR {deliveryFee}</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-success/10 rounded-2xl flex-shrink-0">
              <ShoppingBag size={14} className="text-success" />
              <span className="text-[10px] font-black whitespace-nowrap">
                MIN: PKR {settings.min_order_value || 0}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 rounded-2xl flex-shrink-0">
              <Clock size={14} className="text-amber-500" />
              <span className="text-[10px] font-black whitespace-nowrap">
                {settings.estimated_delivery_time || '45-60 min'}
              </span>
            </div>
            {flashSales && flashSales.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-2xl flex-shrink-0 animate-pulse">
                <Zap size={14} className="text-red-500" />
                <span className="text-[10px] font-black whitespace-nowrap text-red-600">
                  {flashSales.length} FLASH SALE{flashSales.length > 1 ? 'S' : ''}
                </span>
              </div>
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
            className="px-4"
          >
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
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
      <div className="space-y-6 mt-4 pb-12">
        {/* Horizontal Categories - Beautiful Icons */}
        <section className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded-full" />
              {t('grocery.shopByStore')}
            </h2>
            <Badge variant="secondary" className="rounded-full font-black text-[10px]">
              {categories?.filter(c => c.is_active).length || 0} Categories
            </Badge>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1 -mx-1">
            {/* All Products Button */}
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex flex-col items-center gap-2 flex-shrink-0 group outline-none"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 relative ${!selectedCategory ? 'bg-gradient-to-br from-primary to-orange-500 shadow-xl shadow-primary/30' : 'bg-muted/60 hover:bg-muted'}`}>
                <Sparkles className={`w-7 h-7 ${!selectedCategory ? 'text-white' : 'text-primary/70'}`} />
                {!selectedCategory && (
                  <motion.div layoutId="cat-glow" className="absolute inset-0 rounded-2xl bg-primary animate-pulse blur-xl opacity-30 -z-10" />
                )}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${!selectedCategory ? 'text-primary' : 'text-muted-foreground'}`}>
                {t('grocery.all')}
              </span>
            </button>

            {categories?.filter(c => c.is_active).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="flex flex-col items-center gap-2 flex-shrink-0 group outline-none"
              >
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 relative ${selectedCategory === cat.id
                      ? 'bg-gradient-to-br from-primary to-orange-500 shadow-xl shadow-primary/30'
                      : 'bg-muted/60 hover:bg-muted'
                    }`}
                >
                  <span className="text-3xl">{getCategoryIcon(cat.name)}</span>
                  {selectedCategory === cat.id && (
                    <motion.div layoutId="cat-glow" className="absolute inset-0 rounded-2xl bg-primary animate-pulse blur-xl opacity-30 -z-10" />
                  )}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider line-clamp-1 max-w-[64px] ${selectedCategory === cat.id ? 'text-primary' : 'text-muted-foreground'}`}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Promo Banner - Large */}
        <section className="px-4">
          <div className="rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/10 border border-border/30">
            <BannerCarousel type="grocery" />
          </div>
        </section>

        {/* Flash Sales Section */}
        {flashSales && flashSales.length > 0 && !selectedCategory && (
          <section className="relative">
            <div className="absolute top-0 right-4 -mt-2">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-[8px] font-black px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
                <Zap size={12} />
                FLASH SALE
              </div>
            </div>
            <div className="px-4 flex items-center justify-between mb-4">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <div className="w-1 h-5 bg-red-500 rounded-full" />
                Limited Time Offers
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 pb-4">
              {flashSales.map((sale: any) => (
                <div key={sale.id} className="min-w-[180px] max-w-[180px]">
                  <ProductCard product={sale.product} onProductClick={handleProductClick} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trending Products */}
        {trendingProducts && trendingProducts.length > 0 && !selectedCategory && !searchQuery && (
          <section className="px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <div className="w-1 h-5 bg-orange-500 rounded-full" />
                <Flame size={18} className="text-orange-500" />
                {t('grocery.hotDeals')}
              </h2>
              <Badge variant="outline" className="rounded-full border-orange-500/30 text-orange-600 bg-orange-500/10 text-[9px] font-black">
                HOT
              </Badge>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4">
              {trendingProducts.slice(0, 8).map(p => (
                <div key={p.id} className="min-w-[160px] max-w-[160px]">
                  <ProductCard product={p} onProductClick={handleProductClick} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Featured Products - Grid */}
        {featuredProducts && featuredProducts.length > 0 && !selectedCategory && !searchQuery && (
          <section className="px-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-amber-500 rounded-full" />
                <Star size={18} className="text-amber-500 fill-amber-500" />
                <h2 className="text-lg font-black tracking-tight">
                  {t('grocery.essentialPicks')}
                </h2>
              </div>
              <Button variant="link" size="sm" className="text-primary font-black uppercase text-[10px] h-auto p-0">
                {t('grocery.viewAll')}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {featuredProducts.slice(0, 4).map(p => (
                <ProductCard key={p.id} product={p} onProductClick={handleProductClick} />
              ))}
            </div>
          </section>
        )}

        {/* Recently Viewed */}
        {recentlyViewed && recentlyViewed.length > 0 && !selectedCategory && !searchQuery && (
          <section className="px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-500 rounded-full" />
                <Eye size={18} className="text-blue-500" />
                Recently Viewed
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4">
              {recentlyViewed.slice(0, 6).map((p: any) => (
                <div key={p.id} className="min-w-[140px] max-w-[140px]">
                  <ProductCard product={p} onProductClick={handleProductClick} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category Focus - Fresh */}
        {!selectedCategory && !searchQuery && categories?.find(c => c.name.toLowerCase().includes('fruit') || c.name.toLowerCase().includes('veg')) && (
          <section className="px-4">
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-[2rem] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <Store size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg tracking-tight">{t('grocery.freshFarmDirect')}</h3>
                    <p className="text-[10px] text-muted-foreground font-medium">Farm fresh, directly to you</p>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-700 font-black text-[10px]">
                  FRESH
                </Badge>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2">
                {products?.filter((p: any) =>
                  p.category?.name?.toLowerCase().includes('fruit') ||
                  p.category?.name?.toLowerCase().includes('veg')
                ).slice(0, 6).map(p => (
                  <div key={p.id} className="min-w-[130px]">
                    <ProductCard product={p} onProductClick={handleProductClick} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* All Products Grid with Filters */}
        <section className="px-4 pb-12">
          {/* Filter Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black flex items-center gap-2">
                <div className="w-1 h-5 bg-success rounded-full" />
                {isMedicineSelected ? (
                  <span className="flex items-center gap-1">💊 {t('grocery.medicine')}</span>
                ) : selectedCategory ? (
                  categories?.find(c => c.id === selectedCategory)?.name
                ) : (
                  t('grocery.allProducts')
                )}
              </h2>
              {searchQuery && (
                <Badge variant="secondary" className="rounded-full font-black text-[10px]">
                  {sortedProducts?.length || 0} {t('grocery.found')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-8 px-3"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal size={14} className="mr-1" />
                Filter
              </Button>
              <div className="flex bg-muted rounded-full p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Grid3X3 size={14} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-full transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-6 p-4 bg-muted/30 rounded-2xl"
              >
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 block">
                      Price Range: PKR {priceRange[0]} - {priceRange[1]}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="5000"
                      step="100"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 block">
                      Sort By
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'name', label: 'Name' },
                        { value: 'price_asc', label: 'Price: Low to High' },
                        { value: 'price_desc', label: 'Price: High to Low' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSortBy(option.value as any)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${sortBy === option.value
                              ? 'bg-primary text-white'
                              : 'bg-white dark:bg-muted'
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Products Grid */}
          {catsLoading || prodsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-56 rounded-2xl" />)}
            </div>
          ) : sortedProducts && sortedProducts.length > 0 ? (
            <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-4" : "space-y-3"}>
              {sortedProducts.map(p => (
                <ProductCard key={p.id} product={p} onProductClick={handleProductClick} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/20 border-2 border-dashed border-border/50 rounded-[3rem] flex flex-col items-center">
              <div className="w-20 h-20 bg-muted/40 rounded-full flex items-center justify-center mb-4">
                <Package size={40} className="text-muted-foreground/30" />
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

      {/* Floating Cart Button */}
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-20 left-4 right-4 z-50"
        >
          <button
            onClick={() => navigate("/grocery/cart")}
            className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between transition-all active:scale-95 border-b-4 border-black/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <ShoppingCart size={20} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{totalItems} items</p>
                <p className="text-lg font-black leading-none">PKR {subtotal.toFixed(0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {remainingForMinOrder > 0 ? (
                <span className="text-[10px] font-bold bg-black/10 px-3 py-1.5 rounded-lg">
                  PKR {remainingForMinOrder} {t('grocery.away')}
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-white/20 px-3 py-1.5 rounded-lg">
                  ✓ {t('grocery.ready')}
                </span>
              )}
              <ChevronRight size={20} />
            </div>
          </button>
        </motion.div>
      )}

      {/* Address Selector Modal */}
      <Dialog open={showAddressSelector} onOpenChange={setShowAddressSelector}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black">{t('grocery.selectDeliveryLocation')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setShowAddressSelector(false);
                handleGetCurrentLocation();
              }}
            >
              <Navigation size={18} className="mr-2" />
              {t('grocery.useCurrentLocation')}
            </Button>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('grocery.savedAddresses')}
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {savedAddresses.length > 0 ? (
                savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => handleSelectAddress(addr)}
                    className="w-full text-left p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{addr.address_text}</p>
                        {addr.is_default && (
                          <Badge variant="secondary" className="mt-1 text-[10px]">Default</Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">{t('grocery.noSavedAddresses')}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Detail Modal */}
      <Dialog open={showProductDetail} onOpenChange={setShowProductDetail}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <ProductDetailModal product={selectedProduct} onClose={() => setShowProductDetail(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Product Detail Modal Component
function ProductDetailModal({ product, onClose }: { product: any; onClose: () => void }) {
  const { t } = useTranslation();
  const { addItem } = useGroceryCart();
  const { data: variants } = useGroceryProductVariants(product.id);
  const { data: reviews } = useGroceryProductReviews(product.id);
  const { data: ratingSummary } = useProductRatingSummary(product.id);
  const submitReview = useSubmitGroceryReview();

  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(product.min_quantity || 1);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");

  const hasVariants = variants && variants.length > 0;
  const currentPrice = selectedVariant?.discount_price || selectedVariant?.price || product.discount_price || product.base_price;

  const handleAddToCart = () => {
    addItem(product, quantity, selectedVariant || undefined);
    toast.success(`${product.name} added to cart!`);
    onClose();
  };

  const handleSubmitReview = async () => {
    try {
      await submitReview.mutateAsync({
        product_id: product.id,
        rating: reviewRating,
        title: reviewTitle,
        review_text: reviewText,
      });
      setShowReviewForm(false);
      setReviewTitle("");
      setReviewText("");
      setReviewRating(5);
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Product Image */}
      <div className="aspect-square rounded-2xl overflow-hidden bg-muted/30">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">
            📦
          </div>
        )}
      </div>

      {/* Product Info */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-black">{product.name}</h2>
          {ratingSummary && ratingSummary.total_reviews > 0 && (
            <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-full">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <span className="font-black text-sm">{ratingSummary.average_rating?.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({ratingSummary.total_reviews})</span>
            </div>
          )}
        </div>

        {product.description && (
          <p className="text-sm text-muted-foreground mt-2">{product.description}</p>
        )}

        <div className="flex items-baseline gap-3 mt-3">
          <span className="text-2xl font-black text-primary">PKR {currentPrice}</span>
          {product.base_price > currentPrice && (
            <span className="text-lg text-muted-foreground line-through">PKR {product.base_price}</span>
          )}
        </div>
      </div>

      {/* Variants */}
      {hasVariants && (
        <div>
          <h3 className="font-black text-sm mb-3">Select Size/Weight</h3>
          <div className="grid grid-cols-3 gap-2">
            {variants.map((variant: any) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariant(variant)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${selectedVariant?.id === variant.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                  }`}
              >
                <p className="font-black text-sm">{variant.variant_name}</p>
                <p className="text-xs text-primary font-bold">PKR {variant.discount_price || variant.price}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
        <span className="font-bold">Quantity</span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-full bg-white dark:bg-muted flex items-center justify-center shadow-sm"
          >
            <span className="font-black text-lg">-</span>
          </button>
          <span className="font-black text-xl w-8 text-center">{quantity}</span>
          <button
            onClick={() => setQuantity(Math.min(product.max_quantity || 100, quantity + 1))}
            className="w-10 h-10 rounded-full bg-white dark:bg-muted flex items-center justify-center shadow-sm"
          >
            <span className="font-black text-lg">+</span>
          </button>
        </div>
      </div>

      {/* Add to Cart */}
      <Button
        onClick={handleAddToCart}
        className="w-full h-14 rounded-2xl font-black text-lg"
      >
        <ShoppingCart size={20} className="mr-2" />
        Add to Cart - PKR {currentPrice * quantity}
      </Button>

      {/* Reviews Section */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg">Reviews</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReviewForm(!showReviewForm)}
          >
            Write Review
          </Button>
        </div>

        {/* Review Form */}
        {showReviewForm && (
          <div className="p-4 bg-muted/30 rounded-2xl mb-4 space-y-4">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="p-1"
                >
                  <Star
                    size={28}
                    className={star <= reviewRating ? "text-amber-500 fill-amber-500" : "text-muted"}
                  />
                </button>
              ))}
            </div>
            <Input
              placeholder="Review Title"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              className="rounded-xl"
            />
            <textarea
              placeholder="Your Review"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full p-3 rounded-xl border bg-transparent resize-none"
              rows={3}
            />
            <Button
              onClick={handleSubmitReview}
              disabled={submitReview.isPending}
              className="w-full"
            >
              {submitReview.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-4 max-h-60 overflow-y-auto">
          {reviews && reviews.length > 0 ? (
            reviews.slice(0, 5).map((review: any) => (
              <div key={review.id} className="p-4 bg-muted/20 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="font-black text-xs text-primary">
                      {review.customer?.full_name?.[0] || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{review.customer?.full_name || 'User'}</p>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < review.rating ? "text-amber-500 fill-amber-500" : "text-muted"}
                        />
                      ))}
                    </div>
                  </div>
                  {review.is_verified_purchase && (
                    <Badge variant="secondary" className="text-[8px]">Verified</Badge>
                  )}
                </div>
                {review.title && (
                  <p className="font-bold text-sm mb-1">{review.title}</p>
                )}
                {review.review_text && (
                  <p className="text-sm text-muted-foreground">{review.review_text}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4">No reviews yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
