import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  MapPin, 
  Phone, 
  User,
  Check,
  X,
  ChefHat,
  Package,
  Bike,
  Search,
  Filter,
  Bell
} from "lucide-react";
import ChatButton from "@/components/chat/ChatButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  BusinessOrder,
  useBusinessOrders, 
  useUpdateOrderStatus 
} from "@/hooks/useBusinessDashboard";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface BusinessOrdersManagerProps {
  businessId: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  placed: { label: 'New Order', color: 'bg-blue-500', icon: Bell },
  preparing: { label: 'Preparing', color: 'bg-amber-500', icon: ChefHat },
  on_way: { label: 'On The Way', color: 'bg-purple-500', icon: Bike },
  delivered: { label: 'Delivered', color: 'bg-accent', icon: Check },
  cancelled: { label: 'Cancelled', color: 'bg-destructive', icon: X },
};

export const BusinessOrdersManager = ({ businessId }: BusinessOrdersManagerProps) => {
  const { data: orders, isLoading, refetch } = useBusinessOrders(businessId);
  const updateStatusMutation = useUpdateOrderStatus();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<BusinessOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('business-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, refetch]);

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeOrders = filteredOrders?.filter(o => 
    ['placed', 'preparing'].includes(o.status)
  );
  const pastOrders = filteredOrders?.filter(o => 
    ['on_way', 'delivered', 'cancelled'].includes(o.status)
  );

  const handleStatusUpdate = (orderId: string, status: BusinessOrder['status']) => {
    updateStatusMutation.mutate({ orderId, status, businessId });
  };

  const handleReject = () => {
    if (selectedOrder) {
      updateStatusMutation.mutate(
        { orderId: selectedOrder.id, status: 'cancelled', businessId },
        { onSuccess: () => setSelectedOrder(null) }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Orders</h2>
          <p className="text-muted-foreground">
            {activeOrders?.length || 0} active orders
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Active Orders */}
      {activeOrders && activeOrders.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse-live" />
            Active Orders
          </h3>
          <div className="grid gap-4">
            <AnimatePresence>
              {activeOrders.map((order, index) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={index}
                  onStatusUpdate={handleStatusUpdate}
                  onReject={() => setSelectedOrder(order)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Past Orders */}
      {pastOrders && pastOrders.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Past Orders</h3>
          <div className="grid gap-4">
            {pastOrders.slice(0, 10).map((order, index) => (
              <OrderCard
                key={order.id}
                order={order}
                index={index}
                onStatusUpdate={handleStatusUpdate}
                isPast
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!orders || orders.length === 0) && (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Orders Yet</h3>
          <p className="text-muted-foreground">
            When customers place orders, they'll appear here.
          </p>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-muted-foreground">
              Are you sure you want to reject order #{selectedOrder?.id.slice(0, 8)}?
            </p>
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedOrder(null)}>
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleReject}
              >
                Reject Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface OrderCardProps {
  order: BusinessOrder;
  index: number;
  onStatusUpdate: (orderId: string, status: BusinessOrder['status']) => void;
  onReject?: () => void;
  isPast?: boolean;
}

const OrderCard = ({ order, index, onStatusUpdate, onReject, isPast }: OrderCardProps) => {
  const config = statusConfig[order.status];
  const Icon = config?.icon || Package;
  
  const items = Array.isArray(order.items) ? order.items : [];
  
  const getNextStatus = (): BusinessOrder['status'] | null => {
    switch (order.status) {
      case 'placed': return 'preparing';
      default: return null;
    }
  };

  const nextStatus = getNextStatus();
  const nextConfig = nextStatus ? statusConfig[nextStatus] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={`overflow-hidden ${isPast ? 'opacity-75' : ''}`}>
        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row">
            {/* Status Bar */}
            <div className={`${config.color} p-4 lg:w-48 flex lg:flex-col items-center justify-center gap-3 text-primary-foreground`}>
              <Icon className="h-8 w-8" />
              <div className="text-center">
                <p className="font-bold">{config.label}</p>
                <p className="text-xs opacity-80">
                  {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Order Details */}
            <div className="flex-1 p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-sm text-muted-foreground">
                    #{order.id.slice(0, 8)}
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    PKR {order.total}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {items.length} items
                </Badge>
              </div>

              {/* Items */}
              <div className="space-y-1">
                {items.slice(0, 3).map((item: any, i: number) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {item.quantity}x {item.name}
                  </p>
                ))}
                {items.length > 3 && (
                  <p className="text-sm text-muted-foreground">
                    +{items.length - 3} more items
                  </p>
                )}
              </div>

              {/* Customer Info */}
              <div className="flex flex-wrap gap-4 text-sm">
                {order.customer_phone && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {order.customer_phone}
                  </span>
                )}
                {order.delivery_address && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {order.delivery_address.slice(0, 30)}...
                  </span>
                )}
              </div>

              {/* Notes */}
              {order.notes && (
                <p className="text-sm text-muted-foreground italic border-l-2 border-primary pl-2">
                  {order.notes}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2 flex-wrap">
                <ChatButton 
                  orderId={order.id} 
                  userType="business" 
                  variant="outline"
                  size="sm"
                />
                {order.customer_phone && (
                  <a href={`tel:${order.customer_phone}`}>
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                  </a>
                )}
                {!isPast && nextStatus && (
                  <>
                    {order.status === 'placed' && onReject && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        onClick={onReject}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    )}
                    {nextConfig && (
                      <Button
                        className="gradient-primary text-primary-foreground flex-1"
                        size="sm"
                        onClick={() => onStatusUpdate(order.id, nextStatus)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark as {nextConfig.label}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
