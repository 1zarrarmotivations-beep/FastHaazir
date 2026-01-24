import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Filter, Star, Clock, MapPin, Loader2, RefreshCw, Bug, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBusinesses, useBusinessesDebug } from '@/hooks/useBusinesses';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsAdmin } from '@/hooks/useAdmin';

// Debug Overlay Component - Only visible to admins
const DebugOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { data: debugInfo, isLoading } = useBusinessesDebug('restaurant');
  const [expanded, setExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className="fixed bottom-4 right-4 z-[100] bg-black/90 text-white p-4 rounded-xl shadow-2xl max-w-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading debug info...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-[100] bg-black/95 text-white rounded-xl shadow-2xl max-w-md border border-yellow-500/50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-yellow-400" />
          <span className="font-bold text-sm">DEBUG: Restaurants Query</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/70 hover:text-white" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/70 hover:text-white" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {expanded && debugInfo && (
        <div className="p-3 space-y-3 text-xs max-h-80 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-500/20 rounded-lg p-2 text-center">
              <p className="text-blue-400 font-bold text-lg">{debugInfo.totalInDb}</p>
              <p className="text-white/60">Total in DB</p>
            </div>
            <div className="bg-green-500/20 rounded-lg p-2 text-center">
              <p className="text-green-400 font-bold text-lg">{debugInfo.activeCount}</p>
              <p className="text-white/60">Active</p>
            </div>
            <div className="bg-purple-500/20 rounded-lg p-2 text-center">
              <p className="text-purple-400 font-bold text-lg">{debugInfo.filteredByType}</p>
              <p className="text-white/60">Restaurants</p>
            </div>
          </div>

          {/* Filtered Out Businesses */}
          {debugInfo.filteredOut.length > 0 && (
            <div className="space-y-2">
              <p className="text-yellow-400 font-semibold flex items-center gap-1">
                <span>⚠️ Filtered Out ({debugInfo.filteredOut.length})</span>
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {debugInfo.filteredOut.map((b) => (
                  <div key={b.id} className="bg-red-500/10 border border-red-500/30 rounded p-2">
                    <p className="font-medium text-white">{b.name}</p>
                    <p className="text-red-400 text-[10px]">{b.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success State */}
          {debugInfo.filteredByType > 0 && debugInfo.filteredOut.length === 0 && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
              <p className="text-green-400 font-semibold">✓ All businesses showing correctly</p>
            </div>
          )}

          {/* No Data Warning */}
          {debugInfo.totalInDb === 0 && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-yellow-400 font-semibold">⚠️ No businesses in database</p>
              <p className="text-white/60 mt-1">Admin needs to add businesses first.</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

const Restaurants: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showDebug, setShowDebug] = useState(false);
  
  // Check if user is admin (for debug overlay)
  const { data: isAdmin } = useIsAdmin();
  
  // Use realtime-enabled hook instead of static data
  const { data: restaurants, isLoading, error, refetch, dataUpdatedAt } = useBusinesses('restaurant');

  // Debug logging for realtime updates
  useEffect(() => {
    console.log('[Restaurants] Data updated at:', new Date(dataUpdatedAt).toISOString());
    console.log('[Restaurants] Restaurant count:', restaurants?.length ?? 0);
    if (restaurants) {
      console.log('[Restaurants] Restaurant data:', restaurants.map(r => ({ 
        id: r.id, 
        name: r.name, 
        type: r.type, 
        is_active: r.is_active 
      })));
    }
  }, [dataUpdatedAt, restaurants]);

  // Loading state
  if (isLoading) {
    return (
      <div className="mobile-container bg-background min-h-screen pb-8">
        <header className="sticky top-0 z-50 glass border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="icon" size="icon-sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-foreground">{t('restaurants.title')}</h1>
              <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
            </div>
          </div>
        </header>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} variant="elevated" className="overflow-hidden">
              <Skeleton className="h-36 w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mobile-container bg-background min-h-screen pb-8">
        <header className="sticky top-0 z-50 glass border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="icon" size="icon-sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-foreground">{t('restaurants.title')}</h1>
            </div>
          </div>
        </header>
        <div className="p-4 flex flex-col items-center justify-center gap-4 min-h-[50vh]">
          <p className="text-muted-foreground">{t('errors.networkError')}</p>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.tryAgain')}
          </Button>
        </div>
      </div>
    );
  }

  const restaurantList = restaurants ?? [];

  return (
    <div className="mobile-container bg-background min-h-screen pb-8">
      {/* Debug Overlay - Admin Only */}
      {isAdmin && showDebug && <DebugOverlay onClose={() => setShowDebug(false)} />}
      
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="icon" size="icon-sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-foreground">Restaurants</h1>
            <p className="text-xs text-muted-foreground">{restaurantList.length} places near you</p>
          </div>
          {/* Debug Button - Admin Only */}
          {isAdmin && (
            <Button 
              variant="ghost" 
              size="icon-sm" 
              onClick={() => setShowDebug(!showDebug)}
              className={showDebug ? 'text-yellow-500' : 'text-muted-foreground'}
            >
              <Bug className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2 px-4 pb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search restaurants..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-card shadow-soft border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <Button variant="icon" size="icon">
            <Filter className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Empty state */}
      {restaurantList.length === 0 && (
        <div className="p-4 flex flex-col items-center justify-center gap-4 min-h-[50vh]">
          <p className="text-muted-foreground text-center">No restaurants available right now</p>
          {isAdmin && (
            <p className="text-xs text-muted-foreground text-center">
              Admin: Click the bug icon to see debug info
            </p>
          )}
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      )}

      {/* Restaurants Grid */}
      <div className="p-4 space-y-4">
        {restaurantList.map((restaurant, index) => (
          <motion.div
            key={restaurant.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(`/restaurant/${restaurant.id}`)}
          >
            <Card variant="elevated" className="overflow-hidden cursor-pointer">
              <div className="relative h-36">
                <img 
                  src={restaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop'} 
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
                {restaurant.featured && (
                  <Badge className="absolute top-3 left-3">Featured</Badge>
                )}
                <div className="absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                  <Star className="w-3 h-3 text-primary fill-primary" />
                  <span className="text-xs font-semibold">{restaurant.rating?.toFixed(1) ?? 'N/A'}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{restaurant.name}</h3>
                    <p className="text-xs text-muted-foreground">{restaurant.category || 'Restaurant'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{restaurant.eta || '20-30 min'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{restaurant.distance || 'Nearby'}</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Restaurants;
