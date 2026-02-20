import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Loader2, Bike, Utensils, ShoppingBasket, Sparkles, Zap, Star, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBusinesses, BusinessType } from '@/hooks/useBusinesses';
import { cn } from '@/lib/utils';

interface CategoryAction {
  id: string;
  titleKey: string;
  subtitleKey: string;
  path: string;
  icon: React.ElementType;
  bgIcon: React.ElementType;
  gradient: string;
  shadowColor: string;
  type?: BusinessType;
  badge?: string;
  badgeColor?: string;
  delay: number;
}

const baseActions: CategoryAction[] = [
  {
    id: 'rider',
    titleKey: 'home.assignRider',
    subtitleKey: 'home.onDemandDelivery',
    path: '/assign-rider',
    icon: Bike,
    bgIcon: Zap,
    gradient: 'from-[#2563EB] via-[#4F46E5] to-[#7C3AED]', // Vibrant Blue -> Indigo -> Purple
    shadowColor: 'shadow-indigo-500/25',
    badge: 'Fastest',
    badgeColor: 'bg-white/20',
    delay: 0.1,
  },
  {
    id: 'food',
    titleKey: 'home.orderFood',
    subtitleKey: 'home.restaurantsDining',
    path: '/restaurants',
    icon: Utensils,
    bgIcon: Star,
    gradient: 'from-[#EA580C] via-[#DC2626] to-[#B91C1C]', // Orange -> Red -> Dark Red
    shadowColor: 'shadow-orange-500/25',
    type: 'restaurant',
    badge: 'Popular',
    badgeColor: 'bg-white/20',
    delay: 0.2,
  },
  {
    id: 'grocery',
    titleKey: 'home.orderGrocery',
    subtitleKey: 'home.dailyEssentials',
    path: '/grocery',
    icon: ShoppingBasket,
    bgIcon: Clock,
    gradient: 'from-[#059669] via-[#0D9488] to-[#0F766E]', // Emerald -> Teal
    shadowColor: 'shadow-emerald-500/25',
    type: 'grocery',
    badge: 'Fresh',
    badgeColor: 'bg-white/20',
    delay: 0.3,
  },
];

const CoreActions: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Realtime-enabled business counts
  const { data: restaurants, isLoading: loadingRestaurants } = useBusinesses('restaurant');
  const { data: grocery, isLoading: loadingGrocery } = useBusinesses('grocery');
  const { data: bakeries, isLoading: loadingBakeries } = useBusinesses('bakery');

  const getCategoryCount = (type?: BusinessType): number | null => {
    if (!type) return null;
    switch (type) {
      case 'restaurant': return restaurants?.length ?? 0;
      case 'grocery': return grocery?.length ?? 0;
      case 'bakery': return bakeries?.length ?? 0;
      default: return null;
    }
  };

  const isLoading = (type?: BusinessType): boolean => {
    if (!type) return false;
    switch (type) {
      case 'restaurant': return loadingRestaurants;
      case 'grocery': return loadingGrocery;
      case 'bakery': return loadingBakeries;
      default: return false;
    }
  };

  return (
    <section className="px-5 py-6 space-y-5">
      {baseActions.map((action) => {
        const count = getCategoryCount(action.type);
        const loading = isLoading(action.type);
        const Icon = action.icon;
        const BgIcon = action.bgIcon;

        return (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: action.delay,
              duration: 0.6,
              type: "spring",
              bounce: 0.3
            }}
            className="relative group"
          >
            {/* Animated Glow Behind */}
            <div className={cn(
              "absolute -inset-0.5 rounded-[2rem] bg-gradient-to-r opacity-0 group-hover:opacity-100 transition duration-500 blur-xl group-hover:blur-2xl",
              action.gradient
            )} />

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(action.path)}
              className={cn(
                "relative w-full overflow-hidden rounded-[1.75rem] p-6 text-left border border-white/10",
                "bg-gradient-to-br transition-all duration-300",
                action.gradient,
                action.shadowColor,
                "shadow-lg group-hover:shadow-2xl"
              )}
            >
              {/* Refined Glass Highlight Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-white/5 to-white/10 opacity-100" />

              {/* Dynamic Shine Effect */}
              <div className="absolute inset-0 -translate-x-[150%] skew-x-12 group-hover:animate-shine bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />

              {/* Background Geometric Shapes/Icons */}
              <div className="absolute -right-8 -bottom-8 opacity-[0.08] transform rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-all duration-700 ease-out">
                <BgIcon className="w-40 h-40 text-white" />
              </div>

              <div className="relative z-20 flex items-center justify-between gap-5">
                {/* Icon Container with Double Glass Ring */}
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <Icon className="w-8 h-8 text-white drop-shadow-md" />
                  </div>
                  {/* Floating Notification Dot if counts available */}
                  {!loading && count !== null && count > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm animate-pulse" />
                  )}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-white tracking-tight leading-none group-hover:translate-x-1 transition-transform duration-300">
                      {t(action.titleKey)}
                    </h3>
                    {action.badge && (
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white border border-white/20 backdrop-blur-sm shadow-sm",
                        action.badgeColor
                      )}>
                        {action.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-white/80 line-clamp-1 group-hover:text-white transition-colors">
                    {t(action.subtitleKey)}
                  </p>

                  {/* Dynamic Status Pill */}
                  {action.type && (
                    <div className="mt-2 flex items-center">
                      {loading ? (
                        <div className="h-5 w-24 bg-white/10 rounded-full animate-pulse" />
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/20 border border-white/5 backdrop-blur-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]" />
                          <span className="text-[10px] font-bold text-white/90">
                            {count} {t('home.available')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Arrow Action */}
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:bg-white group-hover:text-primary transition-all duration-300 shadow-sm">
                  <ChevronRight className="w-5 h-5 text-white group-hover:text-current transition-colors" />
                </div>
              </div>
            </motion.button>
          </motion.div>
        );
      })}

      {/* Loading Overlay */}
      {loadingRestaurants && loadingGrocery && loadingBakeries && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </motion.div>
      )}
    </section>
  );
};

export default CoreActions;
