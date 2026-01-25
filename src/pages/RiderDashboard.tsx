import { useState, useEffect, useRef } from 'react';
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
  Power,
  PowerOff,
  User,
  AlertCircle,
  DollarSign,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { RequestCard } from '@/components/rider/RequestCard';
import RiderEarningsCard from '@/components/rider/RiderEarningsCard';
import { useRiderEarningsSummary } from '@/hooks/useRiderPayments';
import NotificationBell from '@/components/notifications/NotificationBell';
import NotificationsSheet from '@/components/notifications/NotificationsSheet';
import { useRiderLocation } from '@/hooks/useRiderLocation';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import LanguageToggle from '@/components/LanguageToggle';
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

type TabType = 'available' | 'active' | 'completed' | 'earnings';

const RiderDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [registerForm, setRegisterForm] = useState({ name: '', phone: '', vehicle_type: 'Bike' });
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const queryClient = useQueryClient();
  const previousRequestsCount = useRef<number>(0);

  const { data: riderProfile, isLoading: profileLoading } = useRiderProfile();
  const { data: pendingRequests = [], isLoading: pendingLoading } = usePendingRequests();
  const { data: activeDeliveries = [], isLoading: activeLoading } = useMyActiveDeliveries();
  const { data: completedDeliveries = [], isLoading: completedLoading } = useMyCompletedDeliveries();
  const { data: earningsSummary } = useRiderEarningsSummary(riderProfile?.id);

  // Enable real-time sync for all orders and payments
  useRealtimeOrders();

  // Auto-set rider online when dashboard mounts
  useAutoSetRiderOnline(riderProfile?.id, riderProfile?.is_online ?? null);

  // Live location tracking - automatically starts when rider goes online
  useRiderLocation(riderProfile?.id, riderProfile?.is_online || false);

  const acceptRequest = useAcceptRequest();
  const updateStatus = useUpdateDeliveryStatus();
  const toggleOnline = useToggleOnlineStatus();
  const registerRider = useRegisterAsRider();

  // Speech notification function
  const speakNotification = (message: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.1;
      utterance.pitch = 1.2;
      utterance.volume = 1;
      utterance.lang = 'en-US';
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Realtime subscription for new rider requests
  useEffect(() => {
    if (!riderProfile?.is_online) return;

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
          console.log('New rider request:', payload);
          
          // Speak "New Order" notification
          speakNotification('New Order! New delivery request available.');
          
          // Show toast notification
          toast.info('🔔 New Order Available!', {
            description: 'A new pickup is waiting for you nearby.',
            duration: 6000,
          });
          
          // Refresh pending requests
          queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [riderProfile?.is_online, queryClient]);

  // Track request count changes for notifications
  useEffect(() => {
    if (pendingRequests.length > previousRequestsCount.current && previousRequestsCount.current > 0) {
      speakNotification('New Order!');
    }
    previousRequestsCount.current = pendingRequests.length;
  }, [pendingRequests.length]);

  const handleAcceptRequest = (requestId: string, requestType: 'rider_request' | 'order' = 'rider_request') => {
    acceptRequest.mutate({ requestId, requestType }, {
      onSuccess: () => {
        toast.success('Request accepted! Head to pickup location.');
        setActiveTab('active');
      },
      onError: (error) => toast.error(error.message),
    });
  };

  const handleUpdateStatus = (requestId: string, newStatus: OrderStatus, requestType: 'rider_request' | 'order' = 'rider_request') => {
    updateStatus.mutate({ requestId, status: newStatus, requestType }, {
      onSuccess: () => {
        if (newStatus === 'delivered') {
          toast.success('Delivery completed! Great job! 🎉');
        } else {
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

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

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

  if (!riderProfile) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto pt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bike className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Become a Rider</h1>
            <p className="text-muted-foreground">Register to start accepting delivery requests</p>
          </motion.div>

          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+92 300 1234567"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <div className="flex gap-3">
                  {['Bike', 'Car', 'Rickshaw'].map((vehicle) => (
                    <Button
                      key={vehicle}
                      variant={registerForm.vehicle_type === vehicle ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRegisterForm(prev => ({ ...prev, vehicle_type: vehicle }))}
                      className="flex-1"
                    >
                      {vehicle === 'Bike' && <Bike className="w-4 h-4 mr-2" />}
                      {vehicle === 'Car' && <Car className="w-4 h-4 mr-2" />}
                      {vehicle === 'Rickshaw' && <Navigation className="w-4 h-4 mr-2" />}
                      {vehicle}
                    </Button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full mt-4"
                disabled={!registerForm.name || !registerForm.phone || registerRider.isPending}
                onClick={() => {
                  registerRider.mutate(registerForm, {
                    onSuccess: () => toast.success('Registered successfully!'),
                    onError: (error) => toast.error(error.message),
                  });
                }}
              >
                {registerRider.isPending ? 'Registering...' : 'Register as Rider'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'available', label: 'Available', count: pendingRequests.length },
    { id: 'active', label: 'Active', count: activeDeliveries.length },
    { id: 'completed', label: 'Completed', count: completedDeliveries.length },
    { id: 'earnings', label: 'Earnings', count: 0 },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              {riderProfile.image ? (
                <img src={riderProfile.image} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h1 className="font-bold text-foreground">{riderProfile.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span>{riderProfile.rating?.toFixed(1) || '4.5'}</span>
                <span>•</span>
                <span>{riderProfile.total_trips || 0} trips</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle variant="compact" />
            <NotificationBell onClick={() => setNotificationsOpen(true)} />
            <div className="flex items-center gap-2">
              {riderProfile.is_online ? (
                <Power className="w-5 h-5 text-green-500" />
              ) : (
                <PowerOff className="w-5 h-5 text-muted-foreground" />
              )}
              <Switch
                checked={riderProfile.is_online || false}
                onCheckedChange={handleToggleOnline}
                disabled={toggleOnline.isPending}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-background rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{activeDeliveries.length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="bg-background rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{completedDeliveries.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="bg-background rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">
              Rs {earningsSummary?.totalEarnings || 0}
            </p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="bg-background rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-500">
              Rs {earningsSummary?.paidEarnings || 0}
            </p>
            <p className="text-xs text-muted-foreground">Paid</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 bg-card border-b border-border">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="flex-1"
            >
              {tab.label}
              {tab.count > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {tab.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <AnimatePresence mode="wait">
          {activeTab === 'available' && (
            <motion.div
              key="available"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {!riderProfile.is_online ? (
                <div className="text-center py-12">
                  <PowerOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Go online to see available requests</p>
                </div>
              ) : pendingLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No available requests right now</p>
                  <p className="text-xs text-muted-foreground mt-1">New requests will appear here</p>
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <RequestCard 
                    key={request.id} 
                    request={request} 
                    showActions 
                    activeTab="available"
                    onAccept={handleAcceptRequest}
                    isAccepting={acceptRequest.isPending}
                  />
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'active' && (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {activeLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : activeDeliveries.length === 0 ? (
                <div className="text-center py-12">
                  <Navigation className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active deliveries</p>
                  <p className="text-xs text-muted-foreground mt-1">Accept a request to get started</p>
                </div>
              ) : (
                activeDeliveries.map((request) => (
                  <RequestCard 
                    key={request.id} 
                    request={request} 
                    showActions 
                    activeTab="active"
                    onUpdateStatus={handleUpdateStatus}
                    isUpdating={updateStatus.isPending}
                  />
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'completed' && (
            <motion.div
              key="completed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {completedLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : completedDeliveries.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No completed deliveries yet</p>
                </div>
              ) : (
                completedDeliveries.map((request) => (
                  <RequestCard key={request.id} request={request} activeTab="completed" />
                ))
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
              {riderProfile && <RiderEarningsCard riderId={riderProfile.id} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <NotificationsSheet 
        open={notificationsOpen} 
        onOpenChange={setNotificationsOpen} 
      />
    </div>
  );
};

export default RiderDashboard;
