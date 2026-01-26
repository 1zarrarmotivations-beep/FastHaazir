import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Package, 
  Navigation, 
  CheckCircle2, 
  Star,
  Bike,
  Car,
  AlertCircle,
  Bell,
  Settings,
  History,
  Info
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
import NotificationBell from '@/components/notifications/NotificationBell';
import NotificationsSheet from '@/components/notifications/NotificationsSheet';
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
  OrderStatus
} from '@/hooks/useRiderDashboard';

// Import new components
import RiderStatusHeader from '@/components/rider/RiderStatusHeader';
import RiderQuickActions from '@/components/rider/RiderQuickActions';
import RiderOrderRequestCard from '@/components/rider/RiderOrderRequestCard';
import RiderBottomNav, { RiderTab } from '@/components/rider/RiderBottomNav';
import RiderHeatmap from '@/components/rider/RiderHeatmap';
import RiderWalletPanel from '@/components/rider/RiderWalletPanel';
import RiderProfilePanel from '@/components/rider/RiderProfilePanel';

// ============ BUILD VERSION MARKER ============
// This helps verify which build is deployed to production
const BUILD_VERSION = 'v2.5.0-2024-01-26';
const BUILD_TIMESTAMP = new Date().toISOString();
console.log(`[RiderDashboard] Build: ${BUILD_VERSION} | Loaded at: ${BUILD_TIMESTAMP}`);
// =============================================

// Auto-offline inactivity timeout (5 minutes)
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

const RiderDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<RiderTab>('home');
  const [ordersSubTab, setOrdersSubTab] = useState<'available' | 'active' | 'completed'>('available');
  const [registerForm, setRegisterForm] = useState({ name: '', phone: '', vehicle_type: 'Bike' });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [heatmapOpen, setHeatmapOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showVersionInfo, setShowVersionInfo] = useState(false);

  const queryClient = useQueryClient();
  const previousRequestsCount = useRef<number>(0);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Sound and vibration notifications
  const { 
    notifyNewOrder, 
    notifySuccess, 
    vibrate,
    canVibrate 
  } = useNotificationSound();

  const { data: riderProfile, isLoading: profileLoading } = useRiderProfile();
  const { data: pendingRequests = [], isLoading: pendingLoading } = usePendingRequests();
  const { data: activeDeliveries = [], isLoading: activeLoading } = useMyActiveDeliveries();
  const { data: completedDeliveries = [], isLoading: completedLoading } = useMyCompletedDeliveries();
  const { data: earningsSummary } = useRiderEarningsSummary(riderProfile?.id);

  // Enable real-time sync
  useRealtimeOrders();

  // Auto-set rider online when dashboard mounts
  useAutoSetRiderOnline(riderProfile?.id, riderProfile?.is_online ?? null);

  // Live location tracking
  useRiderLocation(riderProfile?.id, riderProfile?.is_online || false);

  const acceptRequest = useAcceptRequest();
  const updateStatus = useUpdateDeliveryStatus();
  const toggleOnline = useToggleOnlineStatus();
  const registerRider = useRegisterAsRider();

  // Reset inactivity timer on user activity
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Only set timer if rider is online and not on active delivery
    if (riderProfile?.is_online && activeDeliveries.length === 0) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log('[RiderDashboard] Auto-offline due to inactivity');
        toast.warning('You were set offline due to inactivity', {
          description: 'Tap the switch to go back online',
        });
        toggleOnline.mutate(false);
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [riderProfile?.is_online, activeDeliveries.length, toggleOnline]);

  // Track user activity for auto-offline
  useEffect(() => {
    const handleActivity = () => resetInactivityTimer();
    
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    
    // Initial timer setup
    resetInactivityTimer();

    return () => {
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);

  // Realtime subscription for new rider requests with sound + vibration
  useEffect(() => {
    if (!riderProfile?.is_online) return;

    console.log('[RiderDashboard] Setting up realtime subscription for new orders');

    const channel = supabase
      .channel('rider-requests-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rider_requests',
          filter: 'status=eq.placed'
        },
        (payload) => {
          console.log('[RiderDashboard] New order received:', payload);
          
          // Trigger sound + vibration + speech notification
          notifyNewOrder('New Order! New delivery request available.');
          
          toast.info('🔔 New Order Available!', {
            description: 'A new pickup is waiting for you nearby.',
            duration: 6000,
          });
          
          queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: 'status=eq.placed'
        },
        (payload) => {
          console.log('[RiderDashboard] New restaurant order received:', payload);
          
          // Trigger sound + vibration + speech notification
          notifyNewOrder('New restaurant order available!');
          
          toast.info('🍔 New Restaurant Order!', {
            description: 'A new food delivery is available.',
            duration: 6000,
          });
          
          queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
        }
      )
      .subscribe((status) => {
        console.log('[RiderDashboard] Subscription status:', status);
      });

    return () => {
      console.log('[RiderDashboard] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [riderProfile?.is_online, queryClient, notifyNewOrder]);

  // Track request count changes for additional notification
  useEffect(() => {
    if (pendingRequests.length > previousRequestsCount.current && previousRequestsCount.current > 0) {
      console.log('[RiderDashboard] Pending requests increased, triggering notification');
      notifyNewOrder('New Order!');
    }
    previousRequestsCount.current = pendingRequests.length;
  }, [pendingRequests.length, notifyNewOrder]);

  const handleAcceptRequest = (requestId: string, requestType: 'rider_request' | 'order' = 'rider_request') => {
    // Haptic feedback on accept
    vibrate('medium');
    
    acceptRequest.mutate({ requestId, requestType }, {
      onSuccess: () => {
        notifySuccess();
        toast.success('Request accepted! Head to pickup location.');
        setActiveTab('orders');
        setOrdersSubTab('active');
      },
      onError: (error) => toast.error(error.message),
    });
  };

  const handleUpdateStatus = (requestId: string, newStatus: OrderStatus, requestType: 'rider_request' | 'order' = 'rider_request') => {
    // Haptic feedback on status update
    vibrate('short');
    
    updateStatus.mutate({ requestId, status: newStatus, requestType }, {
      onSuccess: () => {
        if (newStatus === 'delivered') {
          notifySuccess();
          toast.success('Delivery completed! Great job! 🎉');
        } else {
          vibrate('success');
          toast.success(`Status updated`);
        }
      },
      onError: (error) => toast.error(error.message),
    });
  };

  const handleToggleOnline = (checked: boolean) => {
    toggleOnline.mutate(checked, {
      onSuccess: () => toast.success(checked ? "You're now online!" : "You're now offline"),
      onError: (error) => toast.error(error.message),
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const getCurrentStatus = (): 'idle' | 'on_delivery' | 'returning' => {
    if (activeDeliveries.length > 0) return 'on_delivery';
    return 'idle';
  };

  // Calculate today's earnings
  const todayEarnings = earningsSummary?.totalEarnings || 0;

  // Loading state
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Login Required</h2>
        <p className="text-muted-foreground text-center mb-4">Please login to access the rider dashboard</p>
        <Button onClick={() => navigate('/auth')}>Go to Login</Button>
      </div>
    );
  }

  // Registration form for new riders
  if (!riderProfile) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto pt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-24 h-24 gradient-primary rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-elevated">
              <Bike className="w-12 h-12 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Become a Rider</h1>
            <p className="text-muted-foreground">Join Fast Haazir and start earning today</p>
          </motion.div>

          <Card className="shadow-card">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+92 300 1234567"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { type: 'Bike', icon: Bike },
                    { type: 'Car', icon: Car },
                    { type: 'Rickshaw', icon: Navigation }
                  ].map(({ type, icon: Icon }) => (
                    <motion.button
                      key={type}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setRegisterForm(prev => ({ ...prev, vehicle_type: type }))}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        registerForm.vehicle_type === type 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-border bg-card text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-sm font-medium">{type}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full h-14 text-lg gradient-primary"
                disabled={!registerForm.name || !registerForm.phone || registerRider.isPending}
                onClick={() => {
                  registerRider.mutate(registerForm, {
                    onSuccess: () => toast.success('Registered successfully!'),
                    onError: (error) => toast.error(error.message),
                  });
                }}
              >
                {registerRider.isPending ? 'Registering...' : 'Start Earning'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Version Indicator - tap to show build info */}
      <button
        onClick={() => setShowVersionInfo(!showVersionInfo)}
        className="fixed top-2 right-2 z-50 opacity-30 hover:opacity-100 transition-opacity"
      >
        <Badge variant="outline" className="text-[10px] bg-background/80 backdrop-blur-sm">
          {BUILD_VERSION}
        </Badge>
      </button>

      {/* Version Info Panel */}
      <AnimatePresence>
        {showVersionInfo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-10 right-2 z-50 bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <span className="font-semibold">Build Info</span>
            </div>
            <p><span className="text-muted-foreground">Version:</span> {BUILD_VERSION}</p>
            <p><span className="text-muted-foreground">Rider ID:</span> {riderProfile?.id?.slice(0, 8)}...</p>
            <p><span className="text-muted-foreground">Online:</span> {riderProfile?.is_online ? '✅ Yes' : '❌ No'}</p>
            <p><span className="text-muted-foreground">Pending:</span> {pendingRequests.length}</p>
            <p><span className="text-muted-foreground">Active:</span> {activeDeliveries.length}</p>
            <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setShowVersionInfo(false)}>
              Close
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Header */}
      <RiderStatusHeader
        riderProfile={riderProfile}
        isOnline={riderProfile.is_online || false}
        onToggleOnline={handleToggleOnline}
        isToggling={toggleOnline.isPending}
        todayEarnings={todayEarnings}
        walletBalance={earningsSummary?.pendingEarnings || 0}
        completedToday={completedDeliveries.length}
      />

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Quick Actions */}
            <RiderQuickActions
              onOpenHeatmap={() => setHeatmapOpen(true)}
              onOpenNavigation={() => {
                // Open Google Maps with current location
                if (riderProfile.current_location_lat && riderProfile.current_location_lng) {
                  window.open(`https://www.google.com/maps/@${riderProfile.current_location_lat},${riderProfile.current_location_lng},15z`, '_blank');
                } else {
                  window.open('https://www.google.com/maps', '_blank');
                }
              }}
              activeOrdersCount={activeDeliveries.length}
              pendingOrdersCount={pendingRequests.length}
              currentStatus={getCurrentStatus()}
            />

            {/* Active Deliveries Preview */}
            {activeDeliveries.length > 0 && (
              <div className="px-4 mb-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Current Delivery
                </h3>
                {activeDeliveries.slice(0, 1).map(request => (
                  <RiderOrderRequestCard
                    key={request.id}
                    request={request}
                    variant="active"
                    onUpdateStatus={handleUpdateStatus}
                    isLoading={updateStatus.isPending}
                  />
                ))}
              </div>
            )}

            {/* New Requests Preview */}
            {riderProfile.is_online && pendingRequests.length > 0 && (
              <div className="px-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  New Requests ({pendingRequests.length})
                </h3>
                {pendingRequests.slice(0, 2).map(request => (
                  <RiderOrderRequestCard
                    key={request.id}
                    request={request}
                    variant="new"
                    onAccept={handleAcceptRequest}
                    isLoading={acceptRequest.isPending}
                  />
                ))}
                {pendingRequests.length > 2 && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setActiveTab('orders');
                      setOrdersSubTab('available');
                    }}
                  >
                    View All ({pendingRequests.length}) Requests
                  </Button>
                )}
              </div>
            )}

            {/* Empty State */}
            {!riderProfile.is_online && (
              <div className="px-4 py-12 text-center">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bike className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">You're Offline</h3>
                <p className="text-muted-foreground mb-4">Go online to start receiving orders</p>
              </div>
            )}

            {riderProfile.is_online && pendingRequests.length === 0 && activeDeliveries.length === 0 && (
              <div className="px-4 py-12 text-center">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Ready for Orders</h3>
                <p className="text-muted-foreground mb-4">New requests will appear here</p>
                <Button variant="outline" onClick={() => setHeatmapOpen(true)}>
                  Find Busy Zones
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div
            key="orders"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pt-4"
          >
            {/* Sub-tabs */}
            <div className="flex gap-2 mb-4">
              {[
                { id: 'available', label: 'Available', count: pendingRequests.length },
                { id: 'active', label: 'Active', count: activeDeliveries.length },
                { id: 'completed', label: 'History', count: completedDeliveries.length }
              ].map(tab => (
                <Button
                  key={tab.id}
                  variant={ordersSubTab === tab.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOrdersSubTab(tab.id as typeof ordersSubTab)}
                  className="flex-1"
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 bg-primary-foreground/20 px-1.5 py-0.5 rounded text-xs">
                      {tab.count}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {/* Available Requests */}
            {ordersSubTab === 'available' && (
              <>
                {!riderProfile.is_online ? (
                  <div className="text-center py-12">
                    <Bike className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Go online to see available requests</p>
                  </div>
                ) : pendingLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No available requests right now</p>
                  </div>
                ) : (
                  pendingRequests.map(request => (
                    <RiderOrderRequestCard
                      key={request.id}
                      request={request}
                      variant="new"
                      onAccept={handleAcceptRequest}
                      isLoading={acceptRequest.isPending}
                    />
                  ))
                )}
              </>
            )}

            {/* Active Deliveries */}
            {ordersSubTab === 'active' && (
              <>
                {activeLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : activeDeliveries.length === 0 ? (
                  <div className="text-center py-12">
                    <Navigation className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No active deliveries</p>
                  </div>
                ) : (
                  activeDeliveries.map(request => (
                    <RiderOrderRequestCard
                      key={request.id}
                      request={request}
                      variant="active"
                      onUpdateStatus={handleUpdateStatus}
                      isLoading={updateStatus.isPending}
                    />
                  ))
                )}
              </>
            )}

            {/* Completed Deliveries */}
            {ordersSubTab === 'completed' && (
              <>
                {completedLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : completedDeliveries.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No completed deliveries yet</p>
                  </div>
                ) : (
                  completedDeliveries.map(request => (
                    <RiderOrderRequestCard
                      key={request.id}
                      request={request}
                      variant="completed"
                    />
                  ))
                )}
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'earnings' && (
          <motion.div
            key="earnings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {riderProfile && (
              <RiderWalletPanel
                riderId={riderProfile.id}
                isOpen={true}
                onClose={() => setActiveTab('home')}
              />
            )}
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {riderProfile && (
              <RiderProfilePanel
                riderProfile={riderProfile}
                isOpen={true}
                onClose={() => setActiveTab('home')}
                totalDistance={earningsSummary?.totalDistance || 0}
                onLogout={handleLogout}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <RiderBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={pendingRequests.length}
        activeCount={activeDeliveries.length}
      />

      {/* Notifications Sheet */}
      <NotificationsSheet 
        open={notificationsOpen} 
        onOpenChange={setNotificationsOpen} 
      />

      {/* Heatmap Modal */}
      <RiderHeatmap
        isOpen={heatmapOpen}
        onClose={() => setHeatmapOpen(false)}
        riderLat={riderProfile?.current_location_lat ?? undefined}
        riderLng={riderProfile?.current_location_lng ?? undefined}
      />
    </div>
  );
};

export default RiderDashboard;
