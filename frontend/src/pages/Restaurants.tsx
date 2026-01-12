import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Filter, Star, Clock, MapPin, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBusinesses } from '@/hooks/useBusinesses';
import { Skeleton } from '@/components/ui/skeleton';

const Restaurants: React.FC = () => {
  const navigate = useNavigate();
  
  // Use realtime-enabled hook instead of static data
  const { data: restaurants, isLoading, error, refetch, dataUpdatedAt } = useBusinesses('restaurant');

  // Debug logging for realtime updates
  useEffect(() => {
    console.log('[Restaurants] Data updated at:', new Date(dataUpdatedAt).toISOString());
    console.log('[Restaurants] Restaurant count:', restaurants?.length ?? 0);
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
              <h1 className="font-bold text-foreground">Restaurants</h1>
              <p className="text-xs text-muted-foreground">Loading...</p>
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
              <h1 className="font-bold text-foreground">Restaurants</h1>
            </div>
          </div>
        </header>
        <div className="p-4 flex flex-col items-center justify-center gap-4 min-h-[50vh]">
          <p className="text-muted-foreground">Failed to load restaurants</p>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const restaurantList = restaurants ?? [];

  return (
    <div className="mobile-container bg-background min-h-screen pb-8">
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
