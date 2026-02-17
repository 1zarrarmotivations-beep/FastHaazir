import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBusinesses, BusinessType } from '@/hooks/useBusinesses';

interface CategoryAction {
  titleKey: string;
  subtitleKey: string;
  path: string;
  emoji: string;
  color: string;
  type?: BusinessType;
}

const baseActions: CategoryAction[] = [
  {
    titleKey: 'home.assignRider',
    subtitleKey: 'home.onDemandDelivery',
    path: '/assign-rider',
    emoji: '🚴',
    color: 'from-blue-600 to-indigo-700',
  },
  {
    titleKey: 'home.orderFood',
    subtitleKey: 'home.restaurantsDining',
    path: '/restaurants',
    emoji: '🍔',
    color: 'from-orange-500 to-rose-600',
    type: 'restaurant',
  },
  {
    titleKey: 'home.orderGrocery',
    subtitleKey: 'home.dailyEssentials',
    path: '/grocery',
    emoji: '🛒',
    color: 'from-emerald-500 to-teal-700',
    type: 'grocery',
  },
];

const CoreActions: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Realtime-enabled business counts
  const { data: restaurants, isLoading: loadingRestaurants } = useBusinesses('restaurant');
  const { data: grocery, isLoading: loadingGrocery } = useBusinesses('grocery');
  const { data: bakeries, isLoading: loadingBakeries } = useBusinesses('bakery');

  // Calculate counts from realtime data
  const getCategoryCount = (type?: BusinessType): number | null => {
    if (!type) return null;

    switch (type) {
      case 'restaurant':
        return restaurants?.length ?? 0;
      case 'grocery':
        return grocery?.length ?? 0;
      case 'bakery':
        return bakeries?.length ?? 0;
      default:
        return null;
    }
  };

  const isLoading = (type?: BusinessType): boolean => {
    if (!type) return false;
    switch (type) {
      case 'restaurant':
        return loadingRestaurants;
      case 'grocery':
        return loadingGrocery;
      case 'bakery':
        return loadingBakeries;
      default:
        return false;
    }
  };

  // Debug logging for realtime updates
  React.useEffect(() => {
    console.log('[CoreActions] Realtime counts updated:', {
      restaurants: restaurants?.length ?? 0,
      grocery: grocery?.length ?? 0,
      bakeries: bakeries?.length ?? 0,
    });
  }, [restaurants, grocery, bakeries]);

  return (
    <section className="px-4 py-2">
      <div className="flex flex-col gap-4">
        {baseActions.map((action, index) => {
          const count = getCategoryCount(action.type);
          const loading = isLoading(action.type);

          return (
            <motion.button
              key={action.titleKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.1,
                type: 'spring',
                stiffness: 300,
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(action.path)}
              className={`relative flex items-center gap-4 p-5 rounded-3xl w-full text-left bg-gradient-to-br ${action.color} shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-300 border border-white/10 group overflow-hidden`}
            >
              {/* Decorative light effect */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500" />

              {/* Emoji icon */}
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white/20 backdrop-blur-md border border-white/20 shadow-inner">
                <span className="text-4xl drop-shadow-md">{action.emoji}</span>
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-white">{t(action.titleKey)}</h3>
                <p className="text-sm text-white/80 mt-0.5">
                  {t(action.subtitleKey)}
                  {/* Show count badge if this is a business category */}
                  {action.type && (
                    <span className="ml-2 inline-flex items-center">
                      {loading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">
                          {count} {t('home.available')}
                        </span>
                      )}
                    </span>
                  )}
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-7 h-7 text-white/80 flex-shrink-0" />
            </motion.button>
          );
        })}
      </div>

      {/* Only show loading indicator while all categories are loading */}
      {loadingRestaurants && loadingGrocery && loadingBakeries && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-4 rounded-xl bg-muted text-center"
        >
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground text-sm mt-2">
            {t('home.loadingServices')}
          </p>
        </motion.div>
      )}
    </section>
  );
};

export default CoreActions;
