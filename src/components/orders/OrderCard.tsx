import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, ChevronRight, User, Phone, Package, Navigation, PartyPopper, Star } from 'lucide-react';
import { Order, OrderStatus } from '@/hooks/useOrders';
import ChatButton from '@/components/chat/ChatButton';
import LiveRiderTrackingMap from '@/components/tracking/LiveRiderTrackingMap';
import { useDeliveryNotifications } from '@/hooks/useDeliveryNotifications';

interface OrderCardProps {
  order: Order;
  index: number;
}

const statusConfig: Record<OrderStatus, { label: string; variant: 'muted' | 'secondary' | 'default' | 'success'; step: number }> = {
  placed: { label: 'Finding Rider...', variant: 'muted', step: 1 },
  preparing: { label: 'Rider Assigned', variant: 'secondary', step: 2 },
  on_way: { label: 'On the Way', variant: 'default', step: 3 },
  delivered: { label: 'Delivered', variant: 'success', step: 4 },
  cancelled: { label: 'Cancelled', variant: 'muted', step: 0 },
};

const OrderCard: React.FC<OrderCardProps> = ({ order, index }) => {
  const status = statusConfig[order.status];
  const isRiderRequest = order.type === 'rider_request';
  const hasRider = !!order.rider_id && !!order.riders;
  const showTracking = hasRider && (order.status === 'on_way' || order.status === 'preparing');
  const [showRiderAssigned, setShowRiderAssigned] = useState(false);
  const [prevRiderId, setPrevRiderId] = useState<string | null>(null);

  // Detect when rider is newly assigned
  useEffect(() => {
    if (order.rider_id && !prevRiderId && order.riders) {
      // Rider was just assigned
      setShowRiderAssigned(true);
      const timer = setTimeout(() => setShowRiderAssigned(false), 5000);
      return () => clearTimeout(timer);
    }
    setPrevRiderId(order.rider_id);
  }, [order.rider_id, order.riders, prevRiderId]);

  // Enable delivery notifications for this order
  useDeliveryNotifications({
    id: order.id,
    status: order.status,
    rider_id: order.rider_id,
    delivery_lat: isRiderRequest ? order.dropoff_lat ?? null : order.delivery_lat,
    delivery_lng: isRiderRequest ? order.dropoff_lng ?? null : order.delivery_lng,
    customer_id: order.customer_id,
    type: order.type,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card variant="elevated" className="p-4 overflow-hidden">
        {/* Rider Assigned Celebration Banner */}
        <AnimatePresence>
          {showRiderAssigned && hasRider && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 -mt-4 -mx-4 overflow-hidden"
            >
              <div className="gradient-success p-4 text-white">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                  >
                    <PartyPopper className="w-6 h-6" />
                  </motion.div>
                  <div>
                    <p className="font-bold">🎉 Rider Assigned!</p>
                    <p className="text-sm opacity-90">{order.riders?.name} is on the way</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            {isRiderRequest ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Rider Delivery</h3>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {order.item_description || 'Package delivery'}
                </p>
              </>
            ) : (
              <>
                <h3 className="font-semibold">{order.businesses?.name || 'Order'}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {order.items.map(item => item.name).join(', ')}
                </p>
              </>
            )}
          </div>
          <Badge variant={status.variant}>
            {hasRider && order.status === 'placed' ? 'Rider Assigned' : status.label}
          </Badge>
        </div>

        {/* Rider Info Card - Show prominently when assigned */}
        {hasRider && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-muted/50 border border-border"
          >
            <div className="flex items-center gap-3">
              <img
                src={order.riders?.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'}
                alt={order.riders?.name || 'Rider'}
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{order.riders?.name}</p>
                  {order.riders?.rating && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      {Number(order.riders.rating).toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {order.riders?.vehicle_type || 'Bike'} • {order.riders?.total_trips || 0} trips
                </p>
              </div>
              {order.riders?.phone && (
                <a href={`tel:${order.riders.phone}`}>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <Phone className="w-4 h-4" />
                  </Button>
                </a>
              )}
            </div>
          </motion.div>
        )}

        {/* Waiting for Rider Animation - Show when no rider assigned */}
        {!hasRider && order.status === 'placed' && (
          <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-primary/50"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
              <div>
                <p className="font-medium text-foreground">Finding a rider...</p>
                <p className="text-xs text-muted-foreground">Request sent to nearby riders</p>
              </div>
            </div>
          </div>
        )}

        {/* Live Tracking Map - Show when rider is assigned and order is in transit */}
        {showTracking && (
          <div className="mb-4">
            <LiveRiderTrackingMap
              riderId={order.rider_id!}
              deliveryLat={isRiderRequest ? order.dropoff_lat ?? null : order.delivery_lat}
              deliveryLng={isRiderRequest ? order.dropoff_lng ?? null : order.delivery_lng}
              deliveryAddress={isRiderRequest ? order.dropoff_address || '' : order.delivery_address || ''}
              pickupLat={order.pickup_lat}
              pickupLng={order.pickup_lng}
              pickupAddress={order.pickup_address || undefined}
              status={order.status}
              fallbackEta={order.eta || '25-35 min'}
            />
          </div>
        )}

        {/* Pickup/Dropoff for rider requests (when no map) */}
        {isRiderRequest && !showTracking && (
          <div className="space-y-2 mb-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center shrink-0">
                <MapPin className="w-3 h-3 text-white" />
              </div>
              <span className="text-muted-foreground truncate">{order.pickup_address}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full gradient-success flex items-center justify-center shrink-0">
                <Navigation className="w-3 h-3 text-white" />
              </div>
              <span className="text-muted-foreground truncate">{order.dropoff_address}</span>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                step <= status.step ? 'gradient-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-sm mb-3">
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{order.eta || '25-35 min'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-primary font-medium">
            <span>Rs. {order.total.toLocaleString()}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Chat & Contact Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          {isRiderRequest ? (
            <ChatButton 
              riderRequestId={order.id} 
              userType="customer" 
              variant="outline"
              size="sm"
            />
          ) : (
            <ChatButton 
              orderId={order.id} 
              userType="customer" 
              variant="outline"
              size="sm"
            />
          )}
          {!isRiderRequest && (order.status === 'placed' || order.status === 'preparing') && order.businesses?.owner_phone && (
            <a href={`tel:${order.businesses.owner_phone}`}>
              <Button variant="outline" size="sm">
                <Phone className="w-4 h-4 mr-1" />
                Call Restaurant
              </Button>
            </a>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default OrderCard;