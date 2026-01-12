import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';

const History: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: allOrders, isLoading } = useOrders();

  // Enable real-time sync
  useRealtimeOrders();

  // Filter to only delivered/cancelled orders
  const completedOrders = allOrders?.filter(
    order => order.status === 'delivered' || order.status === 'cancelled'
  ) || [];

  if (authLoading || isLoading) {
    return (
      <div className="mobile-container bg-background min-h-screen pb-24">
        <header className="sticky top-0 z-50 glass border-b border-border/50">
          <div className="px-4 py-4">
            <h1 className="text-xl font-bold text-foreground">Order History</h1>
            <p className="text-sm text-muted-foreground">Your past orders</p>
          </div>
        </header>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            <h1 className="text-xl font-bold text-foreground">Order History</h1>
            <p className="text-sm text-muted-foreground">Your past orders</p>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center h-[50vh] px-4">
          <PackageOpen className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="font-bold text-lg mb-2">Sign in to view history</h2>
          <p className="text-muted-foreground text-sm text-center mb-6">
            Login to see your order history
          </p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
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
          <h1 className="text-xl font-bold text-foreground">Order History</h1>
          <p className="text-sm text-muted-foreground">Your past orders</p>
        </div>
      </header>

      {/* History List */}
      <div className="p-4 space-y-3">
        {completedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh]">
            <PackageOpen className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="font-bold text-lg mb-2">No order history</h2>
            <p className="text-muted-foreground text-sm text-center mb-6">
              Your completed orders will appear here
            </p>
            <Button onClick={() => navigate('/')}>Order Now</Button>
          </div>
        ) : (
          completedOrders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="elevated" className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">
                      {order.businesses?.name || 'Delivery Order'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {order.items.map(item => item.name).join(', ').slice(0, 50)}
                      {order.items.map(item => item.name).join(', ').length > 50 && '...'}
                    </p>
                  </div>
                  <Badge variant={order.status === 'delivered' ? 'success' : 'destructive'}>
                    {order.status === 'delivered' ? 'Delivered' : 'Cancelled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(order.created_at), 'MMM d, yyyy • h:mm a')}
                  </div>
                  <span className="font-bold text-primary">
                    Rs. {order.total.toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => order.business_id && navigate(`/restaurant/${order.business_id}`)}
                    disabled={!order.business_id}
                  >
                    Reorder
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default History;