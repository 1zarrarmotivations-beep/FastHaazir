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
  ShoppingBag,
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
  onAccept?: (id: string, type: 'rider_request' | 'order' | 'grocery') => void;
  onReject?: (id: string) => void;
  onUpdateStatus?: (id: string, status: OrderStatus, type: 'rider_request' | 'order' | 'grocery') => void;
  isLoading?: boolean;
  autoRejectTime?: number;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  placed: { label: 'New Request', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  preparing: { label: 'Pending (Go to Pickup)', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  on_way: { label: 'On The Way (Picked Up)', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  delivered: { label: 'Delivered', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

const getNextAction = (status: OrderStatus): { label: string; nextStatus: OrderStatus; requiresOTP?: boolean } | null => {
  const flow: Record<string, { label: string; nextStatus: OrderStatus; requiresOTP?: boolean }> = {
    placed: { label: 'Mark Picked-up', nextStatus: 'preparing' },
    preparing: { label: 'Mark Picked-up', nextStatus: 'on_way' },
    on_way: { label: 'Mark Delivered', nextStatus: 'delivered', requiresOTP: true },
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

  // New reveal logic: Dropoff revealed only when status is 'on_way'
  const isDropoffRevealed = request.status === 'on_way' || request.status === 'delivered';

  // eslint-disable-next-line react-hooks/exhaustive-deps -- Timer interval intentionally doesn't include timeLeft to prevent restart on every tick
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

  const navigateTo = (lat: number | null, lng: number | null) => {
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
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
      <div className={`glass-card-dark rounded-3xl overflow-hidden transition-all duration-300 border ${variant === 'new'
        ? 'animate-pulse-glow ring-2 ring-orange-500/50 border-orange-500/30'
        : variant === 'active'
          ? 'ring-1 ring-emerald-500/30 border-emerald-500/20'
          : 'ring-1 ring-white/5 border-white/5'
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
          {/* Header & Tactical Earnings */}
          {/* Header & Tactical Earnings - Clean Layout */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4 min-w-0">
              <motion.div
                className={`w-14 h-14 rounded-2xl ${config.bgColor} flex items-center justify-center border border-white/5 shrink-0`}
                animate={variant === 'new' ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {request.type === 'grocery' ? (
                  <ShoppingBag className={`w-7 h-7 ${config.color}`} />
                ) : request.type === 'order' ? (
                  <Store className={`w-7 h-7 ${config.color}`} />
                ) : (
                  <Package className={`w-7 h-7 ${config.color}`} />
                )}
              </motion.div>
              <div className="min-w-0">
                <p className="font-black text-white text-lg tracking-tight leading-tight truncate">
                  {request.business_name || request.item_description || 'Tactical Delivery'}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{config.label}</span>
                  {variant === 'new' && (
                    <span className="text-orange-500 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md bg-orange-500/5 border border-orange-500/10">
                      <Timer className="w-3 h-3" />
                      {timeLeft}S
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-0.5">EST. PAYOUT</p>
              <p className="text-xl font-black text-emerald-500 tabular-nums">₨ {request.rider_earning ?? request.delivery_fee ?? 0}</p>
              {hasCoordinates && (
                <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1">
                  {distance.toFixed(1)} km TOTAL
                </p>
              )}
            </div>
          </div>

          {/* Tactical Logistics - Locations */}
          <div className="space-y-8 relative">
            {/* Connection Line */}
            {isDropoffRevealed && (
              <div className="absolute left-[7px] top-6 bottom-6 w-[1.5px] bg-gradient-to-b from-emerald-500 via-primary to-orange-500 opacity-20 rounded-full" />
            )}

            {/* Pickup Node */}
            <div className="flex items-start gap-6 relative z-10">
              <div className="shrink-0 mt-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] border-2 border-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-emerald-500 font-black uppercase tracking-[0.3em]">Sector 01: Pickup</span>
                    <span className="text-[7px] text-white/20 font-black uppercase tracking-widest mt-0.5">EST. REACH: 4 MINS</span>
                  </div>
                  {variant === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-4 text-[9px] font-black uppercase tracking-[0.2em] border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/20 hover:text-emerald-300 rounded-full backdrop-blur-md"
                      onClick={() => navigateTo(request.pickup_lat, request.pickup_lng)}
                    >
                      <Navigation className="w-3 h-3 mr-2" />
                      NAVIGATE
                    </Button>
                  )}
                </div>
                <p className="text-[15px] font-black text-white/90 leading-tight tracking-tight break-words">{request.pickup_address}</p>
              </div>
            </div>

            {/* Dropoff Node */}
            {isDropoffRevealed ? (
              <div className="flex items-start gap-6 relative z-10">
                <div className="shrink-0 mt-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(255,106,0,0.8)] border-2 border-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-orange-500 font-black uppercase tracking-[0.3em]">Sector 02: Target</span>
                      <span className="text-[7px] text-white/20 font-black uppercase tracking-widest mt-0.5">FINAL OBJECTIVE</span>
                    </div>
                    {variant === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-4 text-[9px] font-black uppercase tracking-[0.2em] border-orange-500/30 text-orange-400 bg-orange-500/5 hover:bg-orange-500/20 hover:text-orange-300 rounded-full backdrop-blur-md"
                        onClick={() => navigateTo(request.dropoff_lat, request.dropoff_lng)}
                      >
                        <Navigation className="w-3 h-3 mr-2" />
                        ENGAGE
                      </Button>
                    )}
                  </div>
                  <p className="text-[15px] font-black text-white/90 leading-tight tracking-tight break-words">{request.dropoff_address}</p>
                </div>
              </div>
            ) : variant === 'active' && (
              <div className="flex items-start gap-6 relative z-10 group cursor-help">
                <div className="shrink-0 mt-2">
                  <div className="w-4 h-4 rounded-full bg-white/5 border-2 border-white/10 group-hover:border-orange-500/20 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col mb-2">
                    <span className="text-[9px] text-white/20 font-black uppercase tracking-[0.3em]">Objective Locked</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-3 hover:bg-white/[0.05] transition-colors backdrop-blur-lg">
                    <Shield className="w-4 h-4 text-white/20" />
                    <p className="text-[10px] font-black text-white/30 italic uppercase tracking-widest">Route Data Encrypted till Departure</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Expanded Content - Tactical Details */}
          <AnimatePresence>
            {isExpanded && variant === 'active' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-6"
              >
                {request.items && request.items.length > 0 && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-4 backdrop-blur-md">
                    <p className="text-[10px] font-black text-white/20 mb-3 uppercase tracking-widest">Inbound Cargo Details</p>
                    <div className="space-y-2.5">
                      {request.items.slice(0, 3).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-[13px]">
                          <span className="text-white/70 font-bold">{item.quantity}x <span className="text-white">{item.name}</span></span>
                          <span className="text-white/40 font-mono">₨ {item.price}</span>
                        </div>
                      ))}
                      {request.items.length > 3 && (
                        <p className="text-[10px] text-white/20 font-black pt-1 border-t border-white/5 uppercase tracking-widest">
                          +{request.items.length - 3} ADDITIONAL UNITS
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tactical Actions */}
          <div className="flex gap-4 mt-6">
            {variant === 'new' && (
              <div className="flex gap-4 w-full">
                <motion.button
                  className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/5 text-white/40 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject?.(request.id)
                  }}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4" />
                  REJECT
                </motion.button>
                <motion.button
                  className="flex-[2] h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(255,106,0,0.3)] hover:brightness-110 transition-all"
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAccept?.(request.id, request.type || 'rider_request')
                  }}
                  disabled={isLoading}
                >
                  <Check className="w-4 h-4" />
                  CONFIRM OPS
                </motion.button>
              </div>
            )}

            {variant === 'active' && (
              <>
                <div className="flex-1 flex gap-3">
                  <ChatButton
                    riderRequestId={request.type === 'order' ? undefined : request.id}
                    orderId={request.type === 'order' ? request.id : undefined}
                    userType="rider"
                    variant="outline"
                    className="h-14 w-14 bg-white/5 border border-white/10 text-white p-0 flex items-center justify-center shrink-0 rounded-2xl hover:bg-white/10 transition-colors backdrop-blur-md"
                  />
                  {nextAction && onUpdateStatus && (
                    <motion.button
                      className={`flex-1 h-14 rounded-2xl text-white font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 shadow-2xl transition-all border border-white/5 ${nextAction.requiresOTP
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/20'
                        : 'bg-gradient-to-r from-primary to-orange-600 shadow-primary/20'
                        }`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (nextAction.requiresOTP) {
                          setShowOTPDialog(true);
                        } else {
                          onUpdateStatus(request.id, nextAction.nextStatus, request.type || 'rider_request');
                        }
                      }}
                      disabled={isLoading}
                    >
                      {nextAction.requiresOTP && <Shield className="w-4 h-4 text-white/60" />}
                      {nextAction.label}
                      <ChevronRight className="w-4 h-4 opacity-40" />
                    </motion.button>
                  )}
                </div>

                <OTPVerificationDialog
                  open={showOTPDialog}
                  onOpenChange={setShowOTPDialog}
                  orderId={request.type === 'order' ? request.id : undefined}
                  riderRequestId={request.type !== 'order' ? request.id : undefined}
                  onVerified={() => {
                    if (onUpdateStatus) {
                      onUpdateStatus(request.id, 'delivered', request.type || 'rider_request');
                    }
                  }}
                />
              </>
            )}

            {variant === 'completed' && (
              <div className="flex-1 flex items-center justify-between py-2">
                <div className="flex items-center gap-3 text-white/20">
                  <Clock className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {new Date(request.created_at).toLocaleDateString()}
                  </span>
                </div>
                <ChatButton
                  riderRequestId={request.type === 'order' ? undefined : request.id}
                  orderId={request.type === 'order' ? request.id : undefined}
                  userType="rider"
                  variant="ghost"
                  className="text-white/30 hover:text-white transition-colors"
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
