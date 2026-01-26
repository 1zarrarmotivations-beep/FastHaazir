import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Clock, 
  Package, 
  Navigation,
  ChevronRight,
  ExternalLink,
  Check,
  X,
  Store,
  Route,
  Banknote,
  Timer,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ChatButton from '@/components/chat/ChatButton';
import { RiderRequest, OrderStatus } from '@/hooks/useRiderDashboard';
import { calculateDistance } from './DeliveryMap';
import { OTPVerificationDialog } from './OTPVerificationDialog';

interface RiderOrderRequestCardProps {
  request: RiderRequest;
  variant: 'new' | 'active' | 'completed';
  onAccept?: (id: string, type: 'rider_request' | 'order') => void;
  onReject?: (id: string) => void;
  onUpdateStatus?: (id: string, status: OrderStatus, type: 'rider_request' | 'order') => void;
  isLoading?: boolean;
  autoRejectTime?: number;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  placed: { label: 'New Request', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  preparing: { label: 'Picked Up', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  on_way: { label: 'On The Way', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  delivered: { label: 'Delivered', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

const getNextAction = (status: OrderStatus): { label: string; nextStatus: OrderStatus; requiresOTP?: boolean } | null => {
  const flow: Record<string, { label: string; nextStatus: OrderStatus; requiresOTP?: boolean }> = {
    placed: { label: 'Picked Up', nextStatus: 'preparing' },
    preparing: { label: 'Start Delivery', nextStatus: 'on_way' },
    on_way: { label: 'Verify & Deliver', nextStatus: 'delivered', requiresOTP: true },
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
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hasCoordinates = request.pickup_lat && request.pickup_lng && request.dropoff_lat && request.dropoff_lng;
  const distance = hasCoordinates
    ? calculateDistance(request.pickup_lat!, request.pickup_lng!, request.dropoff_lat!, request.dropoff_lng!)
    : 0;

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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -100 }}
      className="mb-4"
    >
      <div className={`glass-card-dark rounded-3xl overflow-hidden transition-all duration-300 ${
        variant === 'new' 
          ? 'animate-pulse-glow ring-2 ring-orange-500/50' 
          : variant === 'active'
            ? 'ring-1 ring-emerald-500/30'
            : 'ring-1 ring-white/5'
      }`}>
        {/* Timer Bar for New Requests */}
        {variant === 'new' && (
          <div className="h-1 bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500"
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / autoRejectTime) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div 
                className={`w-14 h-14 rounded-2xl ${config.bgColor} flex items-center justify-center`}
                animate={variant === 'new' ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {request.type === 'order' ? (
                  <Store className={`w-7 h-7 ${config.color}`} />
                ) : (
                  <Package className={`w-7 h-7 ${config.color}`} />
                )}
              </motion.div>
              <div>
                <p className="font-bold text-white text-lg">
                  {request.business_name || request.item_description || 'Delivery Request'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${config.bgColor} ${config.color} border-0 text-xs`}>
                    {config.label}
                  </Badge>
                  {variant === 'new' && (
                    <span className="text-white/50 flex items-center gap-1 text-sm">
                      <Timer className="w-3 h-3" />
                      {timeLeft}s
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Banknote className="w-4 h-4 text-emerald-400" />
                <p className="text-2xl font-bold text-emerald-400">₨{request.total}</p>
              </div>
              {hasCoordinates && (
                <p className="text-xs text-white/50 flex items-center gap-1 justify-end mt-1">
                  <Route className="w-3 h-3" />
                  {distance.toFixed(1)} km
                </p>
              )}
            </div>
          </div>

          {/* Locations */}
          <div 
            className="space-y-3 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {/* Pickup */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                <div className="w-0.5 h-8 bg-gradient-to-b from-emerald-400 to-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40 uppercase tracking-wider">Pickup</p>
                <p className="text-sm font-medium text-white/90 truncate">{request.pickup_address}</p>
              </div>
            </div>

            {/* Dropoff */}
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-red-400 shadow-lg shadow-red-400/50" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40 uppercase tracking-wider">Dropoff</p>
                <p className="text-sm font-medium text-white/90 truncate">{request.dropoff_address}</p>
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
                className="overflow-hidden mt-4"
              >
                {request.items && request.items.length > 0 && (
                  <div className="glass-card rounded-2xl p-4 mb-4">
                    <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Order Items</p>
                    <div className="space-y-2">
                      {request.items.slice(0, 3).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-white/80">{item.quantity}x {item.name}</span>
                          <span className="text-white/50">₨{item.price}</span>
                        </div>
                      ))}
                      {request.items.length > 3 && (
                        <p className="text-xs text-white/40">
                          +{request.items.length - 3} more items
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {hasCoordinates && (
                  <Button
                    variant="outline"
                    className="w-full mb-3 glass-card border-white/10 text-white hover:bg-white/10"
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
          <div className="flex gap-3 mt-4">
            {variant === 'new' && onAccept && (
              <>
                <motion.button
                  className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onReject?.(request.id)}
                  disabled={isLoading}
                >
                  <X className="w-5 h-5" />
                  Reject
                </motion.button>
                <motion.button
                  className="flex-1 h-14 rounded-2xl gradient-rider-success text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onAccept(request.id, request.type || 'rider_request')}
                  disabled={isLoading}
                >
                  <Check className="w-5 h-5" />
                  Accept
                </motion.button>
              </>
            )}

            {variant === 'active' && (
              <>
                <ChatButton
                  riderRequestId={request.type === 'order' ? undefined : request.id}
                  orderId={request.type === 'order' ? request.id : undefined}
                  userType="rider"
                  variant="outline"
                  className="h-14 glass-card border-white/10 text-white"
                />
                {nextAction && onUpdateStatus && (
                  <motion.button
                    className={`flex-1 h-14 rounded-2xl text-white font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all ${
                      nextAction.requiresOTP 
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/25' 
                        : 'gradient-rider-primary shadow-orange-500/25'
                    }`}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (nextAction.requiresOTP) {
                        // Show OTP dialog for delivery verification
                        setShowOTPDialog(true);
                      } else {
                        onUpdateStatus(request.id, nextAction.nextStatus, request.type || 'rider_request');
                      }
                    }}
                    disabled={isLoading}
                  >
                    {nextAction.requiresOTP && <Shield className="w-5 h-5" />}
                    {nextAction.label}
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                )}
              </>
            )}

            {/* OTP Verification Dialog */}
            <OTPVerificationDialog
              open={showOTPDialog}
              onOpenChange={setShowOTPDialog}
              orderId={request.type === 'order' ? request.id : undefined}
              riderRequestId={request.type !== 'order' ? request.id : undefined}
              onVerified={() => {
                // OTP verified, now mark as delivered
                if (onUpdateStatus) {
                  onUpdateStatus(request.id, 'delivered', request.type || 'rider_request');
                }
              }}
            />

            {variant === 'completed' && (
              <div className="flex-1 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/50">
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
                  className="text-white/50"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RiderOrderRequestCard;
