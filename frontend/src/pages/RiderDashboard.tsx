
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Package,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useRiderEarningsSummary } from '@/hooks/useRiderPayments';
import { useRiderLocation } from '@/hooks/useRiderLocation';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import LocationPermissionBlocker from '@/components/rider/LocationPermissionBlocker';
import PermissionWizard from '@/components/common/PermissionWizard';
import { usePermissions, PermissionType } from '@/hooks/usePermissions';

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
} from '@/hooks/useRiderDashboard';

import RiderStatusHeader from '@/components/rider/RiderStatusHeader';
import RiderQuickActions from '@/components/rider/RiderQuickActions';
import RiderOrderRequestCard from '@/components/rider/RiderOrderRequestCard';
import RiderBottomNav, { RiderTab } from '@/components/rider/RiderBottomNav';
import RiderHeatmap from '@/components/rider/RiderHeatmap';
import RiderWalletPanel from '@/components/rider/RiderWalletPanel';
import RiderProfilePanel from '@/components/rider/RiderProfilePanel';
import SpeedMeter from '@/components/rider/SpeedMeter';

/* ================= PRODUCTION BUILD MARKER ================= */
const BUILD_VERSION = 'PROD-v5.0';
const BUILD_HASH = 'b5f3a7c2e9d1' + Date.now().toString(36);
const BUILD_TIMESTAMP = '2026-01-26T14:00:00Z';
const BUILD_VERIFIED = true;
console.log('🔥 RIDER PROD BUILD v5.0 ACTIVE 🔥');
console.log('🔥 PRODUCTION BUILD MARKER:', BUILD_VERSION, BUILD_HASH);
console.log('🔥 TIMESTAMP:', BUILD_TIMESTAMP);
console.log('🔥 SOURCE: src/pages/RiderDashboard.tsx');
console.log('🔥 PREMIUM DARK MODE ACTIVE - PRODUCTION');
/* ============================================================ */

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

const REQUIRED_PERMISSIONS: PermissionType[] = ['location', 'notifications', 'camera', 'microphone'];

const RiderDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, signOut } = useAuth();

  // Permission Hook
  const { permissions, checkPermissions } = usePermissions();
  const [permissionsReady, setPermissionsReady] = useState(false);

  useEffect(() => {
    // Check if any permission status is 'unknown'
    const isReady = !Object.values(permissions).some(s => s === 'unknown');
    setPermissionsReady(isReady);
  }, [permissions]);

  const [activeTab, setActiveTab] = useState<RiderTab>('home');
  const [showVersionInfo, setShowVersionInfo] = useState(false);
  const [heatmapOpen, setHeatmapOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Destructure stopRinging from useNotificationSound
  const { notifyNewOrder, vibrate, stopRinging, enableAudio } =
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

  const {
    permissionStatus,
    isLocationEnabled,
    checkPermissions: checkLocPermissions,
    requestPermissions: requestLocPermissions,
    currentSpeed
  } = useRiderLocation(
    riderProfile?.id,
    riderProfile?.is_online || false
  );

  const acceptRequest = useAcceptRequest();
  const updateStatus = useUpdateDeliveryStatus();
  const toggleOnline = useToggleOnlineStatus();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const registerRider = useRegisterAsRider();

  /* ===== AUTO OFFLINE IF LOCATION DISABLED ===== */
  useEffect(() => {
    // Only warn, don't force offline immediately as it causes toggle instability
    if (riderProfile?.is_online && (isLocationEnabled === false || (permissionsReady && permissions.location !== 'granted'))) {
      toast.error('Location access required', {
        description: 'Please enable GPS and grant location permission to receive nearby orders.'
      });
    }
  }, [isLocationEnabled, permissions.location, permissionsReady, riderProfile?.is_online]);

  /* ===== AUTO OFFLINE INACTIVITY & SOUND INIT ===== */
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
    // Also initialize audio on first touch/click
    const handleInteraction = () => {
      resetInactivityTimer();
      enableAudio();
      // Remove listener after first successful interaction if desired, 
      // but keeping it ensures audio context stays alive
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    resetInactivityTimer();
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [resetInactivityTimer, enableAudio]);

  /* ===== REALTIME ORDERS ===== */
  useEffect(() => {
    if (!riderProfile?.is_online) return;

    // The useRealtimeOrders hook already handles some logic, 
    // but this listener ensures the query cache is invalidated immediately.
    const channel = supabase
      .channel('rider-dashboard-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rider_requests',
        },
        (payload) => {
          console.log('[RiderDashboard] Real-time update:', payload.eventType);
          if (payload.eventType === 'INSERT') {
            notifyNewOrder('New delivery request available');
          }
          queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
          queryClient.invalidateQueries({ queryKey: ['active-deliveries'] });
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
      <div className="min-h-screen bg-background flex items-center justify-center">
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-16 h-16 text-warning" />
        <p className="text-textPrimary text-lg font-medium">Please login to continue</p>
        <Button
          onClick={() => navigate('/auth')}
          className="bg-primary text-white font-semibold px-8 py-3 rounded-2xl"
        >
          Login
        </Button>
      </div>
    );
  }

  if (!riderProfile && !profileLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-4">
        <AlertCircle className="w-16 h-16 text-error" />
        <h2 className="text-2xl font-bold text-textPrimary">Rider Account Not Found</h2>
        <p className="text-textSecondary">
          Your account is not registered as a rider. Please contact support or register as a rider.
        </p>
        <Button
          onClick={() => navigate('/')}
          className="bg-primary text-white font-semibold px-8 py-3 rounded-2xl"
        >
          Go Home
        </Button>
      </div>
    );
  }

  // Determine if we need to show wizard
  // Only show if ready AND we have missing mandatory permissions
  const missingPermissions = REQUIRED_PERMISSIONS.filter(p => permissions[p] !== 'granted');
  const showWizard = permissionsReady && missingPermissions.length > 0;

  /* ================= MAIN UI ================= */
  return (
    <div className="min-h-screen bg-background pb-24 overflow-x-hidden transition-colors duration-300">

      {/* 1. Global Permission Wizard */}
      <PermissionWizard
        isOpen={showWizard}
        requiredPermissions={REQUIRED_PERMISSIONS}
        onComplete={() => {
          checkPermissions();
          // Also refresh location specific one
          checkLocPermissions();
        }}
      />

      {/* 2. Specific Location Service Blocker (GPS enabled check) */}
      {/* Only show if Wizard is NOT showing (to avoid double overlay) */}
      {!showWizard && (
        <LocationPermissionBlocker
          permissionStatus={permissionStatus}
          isLocationEnabled={isLocationEnabled}
          onRequestPermission={requestLocPermissions}
          onCheckAgain={checkLocPermissions}
        />
      )}

      {/* Optimized Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden bg-background">
        {/* Subtle Decorative Gradient */}
        <div
          className="absolute inset-0 opacity-10 dark:opacity-20 transition-opacity"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, transparent 50%, hsl(var(--primary)) 100%)'
          }}
        />

        {/* Subtle, low-cost animated glow */}
        <motion.div
          className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #10B981 0%, transparent 70%)',
          }}
          animate={{
            opacity: [0.05, 0.15, 0.05],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Premium Verified Badge - VISIBLE */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-4 left-4 right-4 z-50 flex justify-between items-center"
      >
        {/* Verification Badge */}
        <motion.div
          className="badge-verified px-3 py-1.5 rounded-full flex items-center gap-2"
          animate={{
            boxShadow: [
              '0 0 16px rgba(16, 185, 129, 0.2)',
              '0 0 24px rgba(16, 185, 129, 0.4)',
              '0 0 16px rgba(16, 185, 129, 0.2)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-emerald-400 text-xs font-bold tracking-wide">🔥 RIDER PROD v4.0 – LIVE 🔥</span>
        </motion.div>

        {/* Version Badge */}
        <motion.button
          onClick={() => setShowVersionInfo(!showVersionInfo)}
          whileTap={{ scale: 0.95 }}
        >
          <Badge className="bg-surface text-textSecondary border-border text-xs font-mono px-3 py-1.5 shadow-sm">
            <Sparkles className="w-3 h-3 mr-1 text-primary" />
            {BUILD_VERSION}
          </Badge>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showVersionInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-16 right-4 z-50 bg-surface/90 backdrop-blur-xl border border-border p-5 rounded-3xl text-xs text-textPrimary min-w-[200px] shadow-elevated"
          >
            <div className="flex items-center gap-2 mb-3 text-success">
              <span>🟢</span>
              <span className="font-bold">Build Verified</span>
            </div>
            <div className="space-y-2 text-textSecondary">
              <p className="font-mono">Version: <span className="text-primary font-bold">{BUILD_VERSION}</span></p>
              <p className="font-mono">Rider: <span className="text-textPrimary">{riderProfile?.id?.slice(0, 8)}</span></p>
              <p className="font-mono">Source: <span className="text-textPrimary">/src</span></p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-3 w-full text-textSecondary hover:text-textPrimary hover:bg-muted"
              onClick={() => setShowVersionInfo(false)}
            >
              Close
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content - Extra top padding for badge */}
      <div className="relative z-10 pt-12">
        <RiderStatusHeader
          riderProfile={riderProfile}
          isOnline={riderProfile?.is_online || false}
          onToggleOnline={(v) => {
            // Safety guard: prevent going offline while active deliveries exist
            if (!v && activeDeliveries.length > 0) {
              toast.error('Complete your active delivery before going offline');
              return;
            }
            toggleOnline.mutate(v);
          }}
          isToggling={toggleOnline.isPending}
          todayEarnings={(earningsSummary as any)?.todayEarnings || 0}
          walletBalance={earningsSummary?.pendingEarnings || 0}
          completedToday={completedDeliveries.filter(d => {
            const date = new Date(d.created_at);
            const now = new Date();
            return date.getDate() === now.getDate() &&
              date.getMonth() === now.getMonth() &&
              date.getFullYear() === now.getFullYear();
          }).length}
          activeDeliveriesCount={activeDeliveries.length}
          currentSpeed={currentSpeed}
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
          onOpenSupport={() => navigate('/rider-support')}
          onOpenEarnings={() => setActiveTab('earnings')}
        />

        {/* Real-time Speed Meter - Show only during active deliveries */}
        {activeDeliveries.length > 0 && (
          <div className="px-4 mt-2">
            <SpeedMeter isActive={riderProfile?.is_online} />
          </div>
        )}

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
                        stopRinging();
                        acceptRequest.mutate({ requestId, requestType });
                        vibrate('success');
                      }}
                      onReject={() => {
                        stopRinging();
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
                  className="bg-surface rounded-3xl p-8 text-center mt-8 border border-border/50"
                >
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Package className="w-10 h-10 text-primary/30" />
                  </div>
                  <h3 className="text-textPrimary text-lg font-semibold mb-2">
                    No Orders Right Now
                  </h3>
                  <p className="text-textSecondary text-sm">
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
                <div className="bg-surface rounded-3xl p-8 text-center border border-border/50">
                  <p className="text-textSecondary">No completed deliveries yet</p>
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
