import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Package, ShoppingBag, Bike } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { toast } from 'sonner';

interface NewOrderNotification {
  id: string;
  type: 'order' | 'rider_request';
  businessName?: string;
  total: number;
  createdAt: string;
}

interface AdminOrderNotificationBadgeProps {
  onTabChange?: (tab: string) => void;
}

export function AdminOrderNotificationBadge({ onTabChange }: AdminOrderNotificationBadgeProps) {
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<NewOrderNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const lastSeenTimestampRef = useRef<string>(new Date().toISOString());
  const queryClient = useQueryClient();
  const { playSound, speakNotification, notifyNewOrder } = useNotificationSound();

  useEffect(() => {
    console.log('[AdminNotification] Starting realtime subscription for new orders');

    // Subscribe to new orders
    const ordersChannel = supabase
      .channel('admin-new-orders-notification')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('[AdminNotification] New order received:', payload);
          const newOrder = payload.new as any;
          
          // Add to recent orders
          const notification: NewOrderNotification = {
            id: newOrder.id,
            type: 'order',
            businessName: 'Food Order',
            total: newOrder.total || 0,
            createdAt: newOrder.created_at,
          };
          
          setRecentOrders(prev => [notification, ...prev.slice(0, 9)]);
          setNewOrdersCount(prev => prev + 1);
          
          // Play notification sound and speak
          notifyNewOrder?.();
          speakNotification?.('New order received!');
          
          // Show toast
          toast.info('🛒 New Order Received!', {
            description: `Amount: Rs. ${newOrder.total?.toLocaleString() || 0}`,
            duration: 5000,
          });
          
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[AdminNotification] Orders subscription active');
        }
      });

    // Subscribe to new rider requests
    const requestsChannel = supabase
      .channel('admin-new-requests-notification')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rider_requests',
        },
        (payload) => {
          console.log('[AdminNotification] New rider request received:', payload);
          const newRequest = payload.new as any;
          
          // Add to recent orders
          const notification: NewOrderNotification = {
            id: newRequest.id,
            type: 'rider_request',
            businessName: 'Rider Delivery',
            total: newRequest.total || 0,
            createdAt: newRequest.created_at,
          };
          
          setRecentOrders(prev => [notification, ...prev.slice(0, 9)]);
          setNewOrdersCount(prev => prev + 1);
          
          // Play notification sound and speak
          notifyNewOrder?.();
          speakNotification?.('New rider request!');
          
          // Show toast
          toast.info('🚴 New Rider Request!', {
            description: `Amount: Rs. ${newRequest.total?.toLocaleString() || 0}`,
            duration: 5000,
          });
          
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['admin-rider-requests'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[AdminNotification] Rider requests subscription active');
        }
      });

    return () => {
      console.log('[AdminNotification] Cleaning up subscriptions');
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, [queryClient, playSound, speakNotification, notifyNewOrder]);

  const handleClearNotifications = () => {
    setNewOrdersCount(0);
    setRecentOrders([]);
    lastSeenTimestampRef.current = new Date().toISOString();
    setShowDropdown(false);
  };

  const handleViewOrders = () => {
    setNewOrdersCount(0);
    setShowDropdown(false);
    onTabChange?.('orders');
  };

  const handleViewRequests = () => {
    setNewOrdersCount(0);
    setShowDropdown(false);
    onTabChange?.('requests');
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <Bell className="w-5 h-5" />
        <AnimatePresence>
          {newOrdersCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1"
            >
              <Badge 
                variant="destructive" 
                className="h-5 min-w-5 flex items-center justify-center text-xs font-bold px-1 animate-pulse"
              >
                {newOrdersCount > 99 ? '99+' : newOrdersCount}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowDropdown(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">New Orders</h3>
                {newOrdersCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleClearNotifications}
                    className="text-xs text-muted-foreground"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              {/* Content */}
              <div className="max-h-80 overflow-y-auto">
                {recentOrders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No new orders</p>
                    <p className="text-xs mt-1">Orders will appear here in real-time</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentOrders.map((order) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          if (order.type === 'order') {
                            handleViewOrders();
                          } else {
                            handleViewRequests();
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            order.type === 'order' 
                              ? 'bg-orange-500/15 text-orange-500' 
                              : 'bg-blue-500/15 text-blue-500'
                          }`}>
                            {order.type === 'order' ? (
                              <ShoppingBag className="w-5 h-5" />
                            ) : (
                              <Bike className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {order.type === 'order' ? 'New Food Order' : 'Rider Request'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Rs. {order.total.toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="muted" className="text-xs shrink-0">
                            New
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-border flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={handleViewOrders}
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  View Orders
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={handleViewRequests}
                >
                  <Bike className="w-4 h-4 mr-2" />
                  Requests
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminOrderNotificationBadge;
