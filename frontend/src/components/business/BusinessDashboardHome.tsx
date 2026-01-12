import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Power, 
  TrendingUp, 
  Clock,
  Package,
  Star,
  ChevronRight,
  Bell
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { BusinessStatsCards } from "./BusinessStatsCards";
import { 
  BusinessProfile,
  BusinessStats,
  BusinessOrder,
  useBusinessOrders,
  useToggleBusinessOnline
} from "@/hooks/useBusinessDashboard";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface BusinessDashboardHomeProps {
  business: BusinessProfile;
  stats: BusinessStats | null | undefined;
  statsLoading: boolean;
  onTabChange: (tab: string) => void;
}

export const BusinessDashboardHome = ({ 
  business, 
  stats, 
  statsLoading,
  onTabChange 
}: BusinessDashboardHomeProps) => {
  const { data: orders, refetch } = useBusinessOrders(business.id);
  const toggleOnlineMutation = useToggleBusinessOnline();

  const activeOrders = orders?.filter(o => 
    ['placed', 'preparing'].includes(o.status)
  ).slice(0, 5) || [];

  // Real-time order updates
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${business.id}`,
        },
        () => {
          refetch();
          // Play notification sound
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business.id, refetch]);

  const handleToggleOnline = () => {
    toggleOnlineMutation.mutate({
      businessId: business.id,
      isActive: !business.is_active,
    });
  };

  const statusColors: Record<string, string> = {
    placed: 'bg-blue-500',
    preparing: 'bg-amber-500',
    on_way: 'bg-purple-500',
    delivered: 'bg-accent',
    cancelled: 'bg-destructive',
  };

  const statusLabels: Record<string, string> = {
    placed: 'New',
    preparing: 'Preparing',
    on_way: 'On Way',
    delivered: 'Done',
    cancelled: 'Cancelled',
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Online Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={`overflow-hidden border-2 ${business.is_active ? 'border-accent' : 'border-destructive'}`}>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">
                  Welcome back! 👋
                </h1>
                <p className="text-muted-foreground">
                  Here's what's happening with your business today
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <Power className={`h-5 w-5 ${business.is_active ? 'text-accent' : 'text-destructive'}`} />
                  <span className="font-medium">
                    {business.is_active ? 'Online' : 'Offline'}
                  </span>
                </div>
                <Switch
                  checked={business.is_active}
                  onCheckedChange={handleToggleOnline}
                  disabled={toggleOnlineMutation.isPending}
                />
              </div>
            </div>
            {!business.is_active && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg flex items-center gap-2 text-destructive">
                <Bell className="h-4 w-4" />
                <span className="text-sm">
                  Your business is offline and hidden from customers. Turn on to start receiving orders.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <BusinessStatsCards stats={stats} isLoading={statsLoading} />

      {/* Quick Actions & Active Orders */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Orders */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Active Orders
                {activeOrders.length > 0 && (
                  <Badge className="bg-primary animate-pulse-glow">
                    {activeOrders.length}
                  </Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onTabChange('orders')}>
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {activeOrders.length > 0 ? (
                <div className="space-y-3">
                  {activeOrders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={`${statusColors[order.status]} text-primary-foreground`}>
                          {statusLabels[order.status]}
                        </Badge>
                        <div>
                          <p className="font-medium text-foreground">
                            #{order.id.slice(0, 8)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {Array.isArray(order.items) ? order.items.length : 0} items • PKR {order.total}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No active orders right now</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Star className="h-4 w-4" />
                  <span className="text-sm">Average Rating</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {business.rating} ⭐
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Delivery Time</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {business.eta}
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">Completion Rate</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.totalOrders ? 
                    `${((stats.completedOrders / stats.totalOrders) * 100).toFixed(0)}%` : 
                    '0%'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => onTabChange('menu')}
              >
                <span className="text-2xl">🍽️</span>
                <span>Add Menu Item</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => onTabChange('orders')}
              >
                <span className="text-2xl">📦</span>
                <span>View Orders</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => onTabChange('earnings')}
              >
                <span className="text-2xl">💰</span>
                <span>Check Earnings</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => onTabChange('profile')}
              >
                <span className="text-2xl">🏪</span>
                <span>Edit Profile</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
