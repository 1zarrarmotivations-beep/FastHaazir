import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Clock, 
  Package, 
  Phone,
  Navigation,
  ChevronRight,
  ExternalLink,
  Check,
  X,
  MessageCircle,
  Store,
  Route
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ChatButton from '@/components/chat/ChatButton';
import { RiderRequest, OrderStatus } from '@/hooks/useRiderDashboard';
import { calculateDistance } from './DeliveryMap';

interface RiderOrderRequestCardProps {
  request: RiderRequest;
  variant: 'new' | 'active' | 'completed';
  onAccept?: (id: string, type: 'rider_request' | 'order') => void;
  onReject?: (id: string) => void;
  onUpdateStatus?: (id: string, status: OrderStatus, type: 'rider_request' | 'order') => void;
  isLoading?: boolean;
  autoRejectTime?: number; // in seconds
}

const statusConfig: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  placed: { label: 'New Request', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  preparing: { label: 'Picked Up', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  on_way: { label: 'On The Way', color: 'text-primary', bgColor: 'bg-primary/10' },
  delivered: { label: 'Delivered', color: 'text-accent', bgColor: 'bg-accent/10' },
  cancelled: { label: 'Cancelled', color: 'text-destructive', bgColor: 'bg-destructive/10' },
};

const getNextAction = (status: OrderStatus): { label: string; nextStatus: OrderStatus } | null => {
  const flow: Record<string, { label: string; nextStatus: OrderStatus }> = {
    placed: { label: 'Reached & Picked Up', nextStatus: 'preparing' },
    preparing: { label: 'Start Delivery', nextStatus: 'on_way' },
    on_way: { label: 'Mark Delivered', nextStatus: 'delivered' },
  };
  return flow[status] || null;
};

const RiderOrderRequestCard = ({
  request,
  variant,
  onAccept,
  onReject,
  onUpdateStatus,
  isLoading = false,
  autoRejectTime = 60
}: RiderOrderRequestCardProps) => {
  const [timeLeft, setTimeLeft] = useState(autoRejectTime);
  const [isExpanded, setIsExpanded] = useState(variant === 'active');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate distance
  const hasCoordinates = request.pickup_lat && request.pickup_lng && request.dropoff_lat && request.dropoff_lng;
  const distance = hasCoordinates
    ? calculateDistance(request.pickup_lat!, request.pickup_lng!, request.dropoff_lat!, request.dropoff_lng!)
    : 0;

  // Timer for new requests
  useEffect(() => {
    if (variant === 'new' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [variant]);

  const config = statusConfig[request.status];
  const nextAction = getNextAction(request.status);

  const openInGoogleMaps = () => {
    if (hasCoordinates) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${request.pickup_lat},${request.pickup_lng}&destination=${request.dropoff_lat},${request.dropoff_lng}&travelmode=driving`;
      window.open(url, '_blank');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="mb-4"
    >
      <Card className={`overflow-hidden border-2 transition-all duration-300 ${
        variant === 'new' 
          ? 'border-primary shadow-elevated animate-pulse-glow' 
          : variant === 'active'
            ? 'border-accent/50 shadow-card'
            : 'border-border shadow-soft'
      }`}>
        {/* Timer Bar for New Requests */}
        {variant === 'new' && (
          <div className="h-1 bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / autoRejectTime) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}>
                {request.type === 'order' ? (
                  <Store className={`w-6 h-6 ${config.color}`} />
                ) : (
                  <Package className={`w-6 h-6 ${config.color}`} />
                )}
              </div>
              <div>
                <p className="font-bold text-foreground">
                  {request.business_name || request.item_description || 'Delivery Request'}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className={`${config.bgColor} ${config.color} border-0`}>
                    {config.label}
                  </Badge>
                  {variant === 'new' && (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeLeft}s
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-xl font-bold text-primary">Rs {request.total}</p>
              {hasCoordinates && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <Route className="w-3 h-3" />
                  {distance.toFixed(1)} km
                </p>
              )}
            </div>
          </div>

          {/* Locations */}
          <div 
            className={`space-y-3 transition-all duration-300 ${isExpanded ? 'mb-4' : 'mb-2'}`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {/* Pickup */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-accent border-2 border-background shadow-sm" />
                <div className="w-0.5 h-8 bg-gradient-to-b from-accent to-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pickup</p>
                <p className="text-sm font-medium text-foreground truncate">{request.pickup_address}</p>
              </div>
            </div>

            {/* Dropoff */}
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-destructive border-2 border-background shadow-sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Dropoff</p>
                <p className="text-sm font-medium text-foreground truncate">{request.dropoff_address}</p>
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && variant === 'active' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {/* Order Items (if available) */}
                {request.items && request.items.length > 0 && (
                  <div className="bg-muted/50 rounded-xl p-3 mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Order Items</p>
                    <div className="space-y-1">
                      {request.items.slice(0, 3).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-foreground">{item.quantity}x {item.name}</span>
                          <span className="text-muted-foreground">Rs {item.price}</span>
                        </div>
                      ))}
                      {request.items.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{request.items.length - 3} more items
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Navigation Button */}
                {hasCoordinates && (
                  <Button
                    variant="outline"
                    className="w-full mb-3"
                    onClick={openInGoogleMaps}
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Open in Google Maps
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-3">
            {variant === 'new' && onAccept && (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 h-14"
                  onClick={() => onReject?.(request.id)}
                  disabled={isLoading}
                >
                  <X className="w-5 h-5 mr-2" />
                  Reject
                </Button>
                <Button
                  size="lg"
                  className="flex-1 h-14 gradient-primary"
                  onClick={() => onAccept(request.id, request.type || 'rider_request')}
                  disabled={isLoading}
                >
                  <Check className="w-5 h-5 mr-2" />
                  Accept
                </Button>
              </>
            )}

            {variant === 'active' && (
              <>
                <ChatButton
                  riderRequestId={request.type === 'order' ? undefined : request.id}
                  orderId={request.type === 'order' ? request.id : undefined}
                  userType="rider"
                  variant="outline"
                  className="h-14"
                />
                {nextAction && onUpdateStatus && (
                  <Button
                    size="lg"
                    className="flex-1 h-14 gradient-primary"
                    onClick={() => onUpdateStatus(request.id, nextAction.nextStatus, request.type || 'rider_request')}
                    disabled={isLoading}
                  >
                    {nextAction.label}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </>
            )}

            {variant === 'completed' && (
              <div className="flex-1 flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {new Date(request.created_at).toLocaleDateString()}
                  </span>
                </div>
                <ChatButton
                  riderRequestId={request.type === 'order' ? undefined : request.id}
                  orderId={request.type === 'order' ? request.id : undefined}
                  userType="rider"
                  variant="ghost"
                />
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default RiderOrderRequestCard;
