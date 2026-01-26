import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Navigation,
  Bike,
  Car,
  AlertCircle,
  Bell,
  Info,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useRiderEarningsSummary } from '@/hooks/useRiderPayments';
import { useRiderLocation } from '@/hooks/useRiderLocation';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { useNotificationSound } from '@/hooks/useNotificationSound';

import {
  useRiderProfile,
  usePendingRequests,
  useMyActiveDeliveries,
  useMyCompletedDeliveries,
  useAcceptRequest,
  useUpdateDeliveryStatus,
  useToggleOnlineStatus,
  useRegisterAsRider,
  useAutoSetRiderOnline,
  OrderStatus,
} from '@/hooks/useRiderDashboard';

import RiderStatusHeader from '@/components/rider/RiderStatusHeader';
import RiderQuickActions from '@/components/rider/RiderQuickActions';
import RiderOrderRequestCard from '@/components/rider/RiderOrderRequestCard';
import RiderBottomNav, { RiderTab } from '@/components/rider/RiderBottomNav';
import RiderHeatmap from '@/components/rider/RiderHeatmap';
import RiderWalletPanel from '@/components/rider/RiderWalletPanel';
import RiderProfilePanel from '@/components/rider/RiderProfilePanel';

/* ================= BUILD MARKER ================= */
const BUILD_VERSION = 'UI-v3-Glass';
const BUILD_TIMESTAMP = new Date().toISOString();
console.log('🔥 RIDER DASHBOARD PRODUCTION FILE LOADED');
console.log('🔥 BUILD_VERSION:', BUILD_VERSION, 'TIMESTAMP:', BUILD_TIMESTAMP);
console.log('🔥 FILE PATH: src/pages/RiderDashboard.tsx');
console.log('🔥 CURRENT TIME:', new Date().toLocaleString());
/* ================================================ */

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

const RiderDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<RiderTab>('home');
  const [ordersSubTab, setOrdersSubTab] =
    useState<'available' | 'active' | 'completed'>('available');
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  const [heatmapOpen, setHeatmapOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousRequestsCount = useRef(0);

  const { notifyNewOrder, notifySuccess, vibrate } =
    useNotificationSound();

  const { data: riderProfile, isLoading: profileLoading } =
    useRiderProfile();
  const { data: pendingRequests = [] } = usePendingRequests();
  const { data: activeDeliveries = [] } = useMyActiveDeliveries();
  const { data: completedDeliveries = [] } =
    useMyCompletedDeliveries();
  const { data: earningsSummary } = useRiderEarningsSummary(
    riderProfile?.id
  );

  useRealtimeOrders();
  useAutoSetRiderOnline(
    riderProfile?.id,
    riderProfile?.is_online ?? null
  );
  useRiderLocation(
    riderProfile?.id,
    riderProfile?.is_online || false
  );

  const acceptRequest = useAcceptRequest();
  const updateStatus = useUpdateDeliveryStatus();
  const toggleOnline = useToggleOnlineStatus();
  const registerRider = useRegisterAsRider();

  /* ===== AUTO OFFLINE ===== */
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current)
      clearTimeout(inactivityTimerRef.current);

    if (riderProfile?.is_online && activeDeliveries.length === 0) {
      inactivityTimerRef.current = setTimeout(() => {
        toast.warning('You were set offline due to inactivity');
        toggleOnline.mutate(false);
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [riderProfile?.is_online, activeDeliveries.length, toggleOnline]);

  useEffect(() => {
    const activity = () => resetInactivityTimer();
    window.addEventListener('click', activity);
    window.addEventListener('touchstart', activity);
    resetInactivityTimer();
    return () => {
      window.removeEventListener('click', activity);
      window.removeEventListener('touchstart', activity);
    };
  }, [resetInactivityTimer]);

  /* ===== REALTIME ORDERS ===== */
  useEffect(() => {
    if (!riderProfile?.is_online) return;

    const channel = supabase
      .channel('rider-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rider_requests',
        },
        () => {
          notifyNewOrder('New delivery request');
          queryClient.invalidateQueries({
            queryKey: ['pending-requests'],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [riderProfile?.is_online, notifyNewOrder, queryClient]);

  /* ===== LOAD STATES ===== */
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen rider-bg flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen rider-bg flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-16 h-16 text-orange-400" />
        <p className="text-white/80 text-lg">Please login to continue</p>
        <Button 
          onClick={() => navigate('/auth')}
          className="gradient-rider-primary text-white font-semibold px-8 py-3 rounded-2xl"
        >
          Login
        </Button>
      </div>
    );
  }

  /* ================= MAIN UI ================= */
  return (
    <div className="min-h-screen rider-bg pb-24 overflow-x-hidden">
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-1/2 -right-1/2 w-full h-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(255,106,0,0.15) 0%, transparent 60%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-1/2 -left-1/2 w-full h-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(0,255,136,0.15) 0%, transparent 60%)',
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -30, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Version Badge */}
      <motion.button
        onClick={() => setShowVersionInfo(!showVersionInfo)}
        className="fixed top-4 right-4 z-50"
        whileTap={{ scale: 0.95 }}
      >
        <Badge className="glass-card text-white/80 border-white/10 text-xs font-mono">
          <Sparkles className="w-3 h-3 mr-1" />
          {BUILD_VERSION}
        </Badge>
      </motion.button>

      <AnimatePresence>
        {showVersionInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 right-4 z-50 glass-card-dark p-4 rounded-2xl text-xs text-white/70"
          >
            <p className="font-mono">Version: {BUILD_VERSION}</p>
            <p className="font-mono">Rider: {riderProfile?.id?.slice(0, 8)}</p>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 text-white/60 hover:text-white"
              onClick={() => setShowVersionInfo(false)}
            >
              Close
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10">
        <RiderStatusHeader
          riderProfile={riderProfile}
          isOnline={riderProfile?.is_online || false}
          onToggleOnline={(v) => toggleOnline.mutate(v)}
          isToggling={toggleOnline.isPending}
          todayEarnings={earningsSummary?.totalEarnings || 0}
          walletBalance={earningsSummary?.pendingEarnings || 0}
          completedToday={completedDeliveries.length}
        />

        <RiderQuickActions
          onOpenHeatmap={() => setHeatmapOpen(true)}
          onOpenNavigation={() =>
            window.open('https://maps.google.com', '_blank')
          }
          activeOrdersCount={activeDeliveries.length}
          pendingOrdersCount={pendingRequests.length}
          currentStatus={
            activeDeliveries.length > 0
              ? 'on_delivery'
              : 'idle'
          }
        />

        {/* Orders Section - Tab Content */}
        <div className="px-4 mt-4">
          {activeTab === 'home' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Active Deliveries */}
              {activeDeliveries.length > 0 && (
                <div>
                  <h3 className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
                    Active Deliveries
                  </h3>
                  {activeDeliveries.map((delivery) => (
                    <RiderOrderRequestCard
                      key={delivery.id}
                      request={delivery}
                      variant="active"
                      onUpdateStatus={(requestId, status, requestType) => 
                        updateStatus.mutate({ requestId, status, requestType })
                      }
                      isLoading={updateStatus.isPending}
                    />
                  ))}
                </div>
              )}

              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <div>
                  <h3 className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
                    New Requests
                  </h3>
                  {pendingRequests.map((request) => (
                    <RiderOrderRequestCard
                      key={request.id}
                      request={request}
                      variant="new"
                      onAccept={(requestId, requestType) => {
                        acceptRequest.mutate({ requestId, requestType });
                        vibrate('success');
                      }}
                      onReject={(id) => {
                        // Handle reject if needed
                      }}
                      isLoading={acceptRequest.isPending}
                    />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {activeDeliveries.length === 0 && pendingRequests.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card rounded-3xl p-8 text-center mt-8"
                >
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                    <Package className="w-10 h-10 text-white/30" />
                  </div>
                  <h3 className="text-white/80 text-lg font-semibold mb-2">
                    No Orders Right Now
                  </h3>
                  <p className="text-white/50 text-sm">
                    {riderProfile?.is_online 
                      ? 'Stay online to receive new delivery requests'
                      : 'Go online to start receiving orders'
                    }
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <h3 className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wide">
                Recent Deliveries
              </h3>
              {completedDeliveries.slice(0, 10).map((delivery) => (
                <RiderOrderRequestCard
                  key={delivery.id}
                  request={delivery}
                  variant="completed"
                />
              ))}
              {completedDeliveries.length === 0 && (
                <div className="glass-card rounded-3xl p-8 text-center">
                  <p className="text-white/50">No completed deliveries yet</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'earnings' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <RiderWalletPanel
                riderId={riderProfile?.id || ''}
                isOpen={true}
                onClose={() => setActiveTab('home')}
              />
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <RiderProfilePanel
                riderProfile={riderProfile!}
                isOpen={true}
                onClose={() => setActiveTab('home')}
                totalDistance={0}
                onLogout={signOut}
              />
            </motion.div>
          )}
        </div>
      </div>

      <RiderBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={pendingRequests.length}
        activeCount={activeDeliveries.length}
      />

      <RiderHeatmap
        isOpen={heatmapOpen}
        onClose={() => setHeatmapOpen(false)}
        riderLat={riderProfile?.current_location_lat ?? undefined}
        riderLng={riderProfile?.current_location_lng ?? undefined}
      />
      <RiderWalletPanel
        riderId={riderProfile?.id || ''}
        isOpen={walletOpen}
        onClose={() => setWalletOpen(false)}
      />
      <RiderProfilePanel
        riderProfile={riderProfile!}
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        totalDistance={0}
        onLogout={signOut}
      />
    </div>
  );
};

export default RiderDashboard;
