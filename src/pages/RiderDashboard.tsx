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
const BUILD_VERSION = 'RIDER-v2.5.0-SRC-ACTIVE';
console.log('🔥 RIDER DASHBOARD ACTIVE:', BUILD_VERSION);
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
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 mb-4" />
        <Button onClick={() => navigate('/auth')}>
          Login
        </Button>
      </div>
    );
  }

  /* ================= MAIN UI ================= */
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* BUILD CONFIRM BADGE */}
      <button
        onClick={() => setShowVersionInfo(!showVersionInfo)}
        className="fixed top-2 right-2 z-50"
      >
        <Badge variant="outline">{BUILD_VERSION}</Badge>
      </button>

      <AnimatePresence>
        {showVersionInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-10 right-2 z-50 bg-card p-3 rounded-lg text-xs"
          >
            <p>Version: {BUILD_VERSION}</p>
            <p>Rider: {riderProfile?.id?.slice(0, 8)}</p>
            <Button
              size="sm"
              onClick={() => setShowVersionInfo(false)}
            >
              Close
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

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

      <RiderBottomNav
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <RiderHeatmap
        open={heatmapOpen}
        onClose={() => setHeatmapOpen(false)}
      />
      <RiderWalletPanel
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
      />
      <RiderProfilePanel
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  );
};

export default RiderDashboard;
