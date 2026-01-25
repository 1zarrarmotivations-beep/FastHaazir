import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import CoreActions from '@/components/CoreActions';
import HorizontalScrollSection from '@/components/HorizontalScrollSection';
import FloatingCart from '@/components/FloatingCart';
import { useNavigate } from 'react-router-dom';
import { useBusinesses } from '@/hooks/useBusinesses';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useAdmin';

const Index: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  const hasRedirected = useRef(false);
  
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

  return (
    <div className="mobile-container bg-background min-h-screen pb-24">
      <Header />
      
      <main>
        {/* Compact Hero */}
        <motion.section 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="px-4 pt-4 pb-2"
        >
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground ltr-keep">
              {t('common.appName')} 🚀
            </h1>
            <p className="text-sm mt-1 text-primary">
              {t('home.tagline', 'کوئٹہ کی تیز ترین ڈیلیوری سروس')}
            </p>
          </div>
        </motion.section>

        {/* Core Actions - Main CTAs */}
        <CoreActions />

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
            title={`🍽 ${t('home.restaurants')}`}
            subtitle={t('home.restaurantsDining')}
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
            title={`🥐 ${t('home.bakery')}`}
            subtitle={t('menu.freshBaked', 'تازہ بیکری')}
            businesses={bakeries.map(formatBusinessForCard)} 
            onViewAll={() => navigate('/restaurants?type=bakery')} 
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
            title={`🛒 ${t('home.grocery')}`}
            subtitle={t('home.dailyEssentials')}
            businesses={grocery.map(formatBusinessForCard)} 
            onViewAll={() => navigate('/restaurants?type=grocery')} 
            onBusinessClick={id => navigate(`/restaurant/${id}`)} 
          />
        )}
      </main>

      <FloatingCart />
      <BottomNav />
    </div>
  );
};

export default Index;
