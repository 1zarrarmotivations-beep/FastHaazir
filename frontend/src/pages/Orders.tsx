import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import { useActiveOrders } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import OrderCard from '@/components/orders/OrderCard';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';

const Orders: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: orders, isLoading } = useActiveOrders();

  // Enable real-time sync for order updates
  useRealtimeOrders();

  useEffect(() => {
    document.title = "Your Orders | Fast Haazir Quetta";
  }, []);

  if (authLoading) {
    return (
      <div className="mobile-container bg-background min-h-screen pb-24">
        <header className="sticky top-0 z-50 glass border-b border-border/50">
          <div className="px-4 py-4">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </header>
        <div className="p-4 space-y-4">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mobile-container bg-background min-h-screen pb-24">
        <header className="sticky top-0 z-50 glass border-b border-border/50">
          <div className="px-4 py-4">
            <h1 className="text-xl font-bold text-foreground">{t('order.orderHistory')}</h1>
            <p className="text-sm text-muted-foreground">{t('order.trackOrder')}</p>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center h-[50vh] px-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4"
          >
            <User className="w-10 h-10 text-muted-foreground" />
          </motion.div>
          <h2 className="font-bold text-lg mb-2">{t('auth.loginToViewOrders')}</h2>
          <p className="text-muted-foreground text-sm text-center mb-6">
            {t('auth.loginToTrackOrders')}
          </p>
          <Button onClick={() => navigate('/auth')}>
            {t('auth.login')}
          </Button>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="mobile-container bg-background min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">{t('order.orderHistory')}</h1>
          <p className="text-sm text-muted-foreground">{t('order.trackOrder')}</p>
        </div>
      </header>

      {/* Orders List */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          [1, 2].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))
        ) : !orders || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh]">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4"
            >
              <span className="text-4xl">📦</span>
            </motion.div>
            <h2 className="font-bold text-lg mb-2">{t('empty.noOrders')}</h2>
            <p className="text-muted-foreground text-sm text-center mb-6">
              {t('order.ordersWillAppear')}
            </p>
            <Button onClick={() => navigate('/')}>
              {t('home.orderNow')}
            </Button>
          </div>
        ) : (
          orders.map((order, index) => (
            <OrderCard key={order.id} order={order} index={index} />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Orders;
