import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import CustomerHeader from '@/components/customer/CustomerHeader';
import CategoryGrid from '@/components/customer/CategoryGrid';
import BannerCarousel from '@/components/customer/BannerCarousel';
import SearchOverlay from '@/components/customer/SearchOverlay';
import BottomNav from '@/components/BottomNav';
import CoreActions from '@/components/CoreActions';
import HorizontalScrollSection from '@/components/HorizontalScrollSection';
import FloatingCart from '@/components/FloatingCart';
import { useBusinesses } from '@/hooks/useBusinesses';
import { Skeleton } from '@/components/ui/skeleton';
import { SupportSheet } from '@/components/support/SupportSheet';
import { Headphones } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useAdmin';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Clock, MapPin } from 'lucide-react';

const Index: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  const hasRedirected = useRef(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: restaurants, isLoading: loadingRestaurants } = useBusinesses('restaurant');
  const { data: bakeries, isLoading: loadingBakeries } = useBusinesses('bakery');
  const { data: grocery, isLoading: loadingGrocery } = useBusinesses('grocery');

  // Redirect non-customer users to their respective dashboards
  useEffect(() => {
    if (!authLoading && !roleLoading && user && userRole && !hasRedirected.current) {
      if (userRole === 'admin') {
        hasRedirected.current = true;
        navigate('/admin', { replace: true });
      } else if (userRole === 'rider') {
        hasRedirected.current = true;
        navigate('/rider', { replace: true });
      }
    }
  }, [authLoading, roleLoading, user, userRole, navigate]);

  const formatBusinessForCard = (business: any) => ({
    id: business.id,
    name: business.name,
    image: business.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
    rating: Number(business.rating) || 4.5,
    eta: business.eta || '25-35 min',
    distance: business.distance || '1.0 km',
    category: business.category || '',
    featured: business.featured
  });

  // Featured restaurants (top rated)
  const featuredRestaurants = restaurants?.filter(r => r.featured || (r.rating && r.rating >= 4.5)).slice(0, 4) || [];

  return (
    <div className="mobile-container bg-background min-h-screen pb-24">
      {/* Premium Customer Header */}
      <CustomerHeader onSearchClick={() => setSearchOpen(true)} />

      <main>
        {/* Promo Banner */}
        <BannerCarousel />

        {/* Category Grid */}
        <CategoryGrid />

        {/* Core Actions - Main CTAs */}
        <CoreActions />

        {/* Featured Section */}
        {featuredRestaurants.length > 0 && (
          <section className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <span>⭐</span>
                {t('home.featuredRestaurants', 'بہترین ریستوران')}
              </h2>
              <button
                onClick={() => navigate('/restaurants')}
                className="text-xs text-primary font-medium"
              >
                {t('common.viewAll', 'سب دیکھیں')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {featuredRestaurants.map((restaurant, index) => (
                <motion.div
                  key={restaurant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                >
                  <Card variant="elevated" className="overflow-hidden cursor-pointer customer-business-card">
                    <div className="relative h-24">
                      <img
                        src={restaurant.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop'}
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <h3 className="font-semibold text-white text-sm truncate">{restaurant.name}</h3>
                      </div>
                      <div className="absolute top-2 right-2 bg-card/90 backdrop-blur-sm rounded-lg px-1.5 py-0.5 flex items-center gap-1">
                        <Star className="w-3 h-3 text-primary fill-primary" />
                        <span className="text-[10px] font-semibold">{restaurant.rating?.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="p-2">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {restaurant.eta}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {restaurant.distance}
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Restaurants Section */}
        {loadingRestaurants ? (
          <div className="px-4 py-3">
            <Skeleton className="h-5 w-40 mb-3" />
            <div className="flex gap-3 overflow-hidden">
              {[1, 2].map(i => (
                <Skeleton key={i} className="w-56 h-36 rounded-xl flex-shrink-0" />
              ))}
            </div>
          </div>
        ) : restaurants && restaurants.length > 0 && (
          <HorizontalScrollSection
            title={`🍽️ ${t('home.restaurants', 'ریستوران')}`}
            subtitle={t('home.restaurantsDining', 'کھانا اور ڈائننگ')}
            businesses={restaurants.map(formatBusinessForCard)}
            onViewAll={() => navigate('/restaurants')}
            onBusinessClick={id => navigate(`/restaurant/${id}`)}
            priorityFirstImage
          />
        )}

        {/* Bakeries Section */}
        {loadingBakeries ? (
          <div className="px-4 py-3">
            <Skeleton className="h-5 w-40 mb-3" />
            <div className="flex gap-3 overflow-hidden">
              {[1, 2].map(i => (
                <Skeleton key={i} className="w-56 h-36 rounded-xl flex-shrink-0" />
              ))}
            </div>
          </div>
        ) : bakeries && bakeries.length > 0 && (
          <HorizontalScrollSection
            title={`🥐 ${t('home.bakery', 'بیکری')}`}
            subtitle={t('menu.freshBaked', 'تازہ بیکری آئٹمز')}
            businesses={bakeries.map(formatBusinessForCard)}
            onViewAll={() => navigate('/bakery')}
            onBusinessClick={id => navigate(`/restaurant/${id}`)}
          />
        )}

        {/* Grocery Section */}
        {loadingGrocery ? (
          <div className="px-4 py-3">
            <Skeleton className="h-5 w-40 mb-3" />
            <div className="flex gap-3 overflow-hidden">
              {[1, 2].map(i => (
                <Skeleton key={i} className="w-56 h-36 rounded-xl flex-shrink-0" />
              ))}
            </div>
          </div>
        ) : grocery && grocery.length > 0 && (
          <HorizontalScrollSection
            title={`🛒 ${t('home.grocery', 'گروسری')}`}
            subtitle={t('home.dailyEssentials', 'روزمرہ ضروریات')}
            businesses={grocery.map(formatBusinessForCard)}
            onViewAll={() => navigate('/grocery')}
            onBusinessClick={id => navigate(`/restaurant/${id}`)}
          />
        )}
      </main>

      {/* Search Overlay */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <FloatingCart />
      <div className="fixed bottom-24 right-4 z-40">
        <SupportSheet
          trigger={
            <Button size="icon" className="w-14 h-14 rounded-full shadow-2xl gradient-primary text-white border-2 border-white/20">
              <Headphones className="w-6 h-6" />
            </Button>
          }
        />
      </div>
      <BottomNav />
    </div>
  );
};

export default Index;
