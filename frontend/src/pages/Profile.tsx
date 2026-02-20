import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  MapPin,
  HelpCircle,
  LogOut,
  ChevronRight,
  Bell,
  Shield,
  Package,
  Edit2,
  Star,
  Bike,
  Store,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useAdmin';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { useOrders } from '@/hooks/useOrders';
import { useCustomerAddresses } from '@/hooks/useCustomerAddresses';
import { toast } from 'sonner';

// Profile sub-screens
import EditProfileSheet from '@/components/profile/EditProfileSheet';
import SavedAddresses from '@/components/profile/SavedAddresses';
import NotificationSettingsScreen from '@/components/profile/NotificationSettingsScreen';
import HelpSupportScreen from '@/components/profile/HelpSupportScreen';
import NotificationBell from '@/components/notifications/NotificationBell';
import NotificationsSheet from '@/components/notifications/NotificationsSheet';
import { SupportChat } from '@/components/support/SupportChat';
import DeleteAccountDialog from '@/components/profile/DeleteAccountDialog';
import { Trash2 } from 'lucide-react';

type ScreenType = 'main' | 'addresses' | 'notifications' | 'help' | 'support';

// Profile skeleton for instant loading perception
const ProfileSkeleton = () => (
  <div className="mobile-container bg-background min-h-screen pb-24">
    {/* Header Skeleton */}
    <header className="gradient-hero pt-8 pb-16 px-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-2xl" />
          <div className="flex-1">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
    </header>

    {/* Stats Card Skeleton */}
    <div className="px-4 -mt-8 relative z-10">
      <Card variant="elevated" className="p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <Skeleton className="h-8 w-8 mx-auto mb-1" />
            <Skeleton className="h-3 w-12 mx-auto" />
          </div>
          <div className="border-x border-border">
            <Skeleton className="h-8 w-8 mx-auto mb-1" />
            <Skeleton className="h-3 w-12 mx-auto" />
          </div>
          <div>
            <Skeleton className="h-8 w-8 mx-auto mb-1" />
            <Skeleton className="h-3 w-12 mx-auto" />
          </div>
        </div>
      </Card>
    </div>

    {/* Menu Items Skeleton */}
    <div className="p-4 space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} variant="elevated" className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-5 w-32" />
          </div>
        </Card>
      ))}
    </div>
    <BottomNav />
  </div>
);

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  // Only fetch customer data if role is customer (or still loading role)
  const isCustomer = !userRole || userRole.role === 'customer';

  // Conditional queries - only fetch if customer role
  const { data: profile, isLoading: profileLoading } = useCustomerProfile();
  const { data: orders } = useOrders();
  const { data: addresses = [] } = useCustomerAddresses();

  const [currentScreen, setCurrentScreen] = useState<ScreenType>('main');
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [notificationsSheetOpen, setNotificationsSheetOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // Try to sign out from Firebase if available
      try {
        const { getAuth, signOut: firebaseSignOut } = await import('firebase/auth');
        const auth = getAuth();
        await firebaseSignOut(auth);
      } catch (e) {
        // Firebase not available, continue with Supabase logout
      }
      await signOut(navigate);
      toast.success('لاگ آؤٹ ہو گیا');
    } catch (error) {
      console.error('[Profile] Logout error:', error);
      toast.error('لاگ آؤٹ میں خرابی');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogin = () => {
    navigate('/auth');
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return '+92 XXX XXXXXXX';
    return phone;
  };

  // Memoized computed values
  const displayName = useMemo(() => profile?.name || 'Customer', [profile?.name]);
  const orderCount = useMemo(() => isCustomer ? (orders?.length || 0) : 0, [orders, isCustomer]);
  const addressCount = useMemo(() => isCustomer ? addresses.length : 0, [addresses, isCustomer]);
  const defaultAddress = useMemo(() => addresses.find(a => a.is_default), [addresses]);

  // Role-based dashboard config (Business role removed - Admin controls all)
  const roleConfig = {
    admin: {
      label: 'Admin Dashboard',
      path: '/admin',
      icon: ShieldCheck,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    super_admin: {
      label: 'Super Admin Dashboard',
      path: '/admin',
      icon: ShieldCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-600/10'
    },
    rider: {
      label: 'Rider Dashboard',
      path: '/rider',
      icon: Bike,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    business: {
      label: 'Business Dashboard',
      path: '/business',
      icon: Store,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
  };

  const userRoleStr = userRole?.role || 'customer';
  const currentRoleConfig = userRole && userRoleStr !== 'customer' ? roleConfig[userRoleStr as keyof typeof roleConfig] : null;

  // Memoized menu items - only show customer-specific items to customers
  const menuItems = useMemo(() => {
    const baseItems = [
      {
        icon: Edit2,
        label: 'Edit Profile',
        action: () => setEditProfileOpen(true),
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        showFor: 'all' as const,
      },
      {
        icon: MapPin,
        label: 'Saved Addresses',
        badge: addressCount > 0 ? String(addressCount) : undefined,
        action: () => setCurrentScreen('addresses'),
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        showFor: 'customer' as const,
      },
      {
        icon: Package,
        label: 'Order History',
        action: () => navigate('/history'),
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        showFor: 'customer' as const,
      },
      {
        icon: Bell,
        label: 'Notification Settings',
        action: () => setCurrentScreen('notifications'),
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        showFor: 'all' as const,
      },
      {
        icon: HelpCircle,
        label: 'Help & Support',
        action: () => setCurrentScreen('support'),
        color: 'text-cyan-500',
        bgColor: 'bg-cyan-500/10',
        showFor: 'all' as const,
      },
      {
        icon: Bike,
        label: 'Become a Rider',
        action: () => navigate('/rider/register'),
        color: 'text-blue-600',
        bgColor: 'bg-blue-600/10',
        showFor: 'customer' as const,
      },
      {
        icon: Shield,
        label: 'Privacy & Security',
        action: () => navigate('/privacy-policy'),
        color: 'text-pink-500',
        bgColor: 'bg-pink-500/10',
        showFor: 'all' as const,
      },
      {
        icon: Trash2,
        label: 'Delete Account',
        action: () => setDeleteAccountOpen(true),
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        showFor: 'all' as const,
      },
    ];

    // Filter based on role
    return baseItems.filter(item =>
      item.showFor === 'all' || (item.showFor === 'customer' && isCustomer)
    );
  }, [addressCount, navigate, isCustomer]);

  // Handle sub-screen navigation
  if (currentScreen === 'addresses') {
    return <SavedAddresses onBack={() => setCurrentScreen('main')} />;
  }

  if (currentScreen === 'notifications') {
    return <NotificationSettingsScreen onBack={() => setCurrentScreen('main')} />;
  }

  if (currentScreen === 'help') {
    return <HelpSupportScreen onBack={() => setCurrentScreen('main')} />;
  }

  if (currentScreen === 'support') {
    return (
      <div className="mobile-container fixed inset-0 z-[100] bg-background flex flex-col h-screen">
        <SupportChat onClose={() => setCurrentScreen('main')} />
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button onClick={() => setCurrentScreen('main')} variant="outline" className="w-full">Back to Profile</Button>
        </div>
      </div>
    );
  }

  // Show skeleton only during initial auth check - role and profile load in background
  if (authLoading) {
    return <ProfileSkeleton />;
  }

  // For non-customers, skip profile loading state
  const showProfileLoading = isCustomer && profileLoading && roleLoading;

  return (
    <div className="mobile-container bg-background min-h-screen pb-24">
      {/* Header */}
      <header className="gradient-hero pt-8 pb-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl bg-primary-foreground/20 flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={() => user && setEditProfileOpen(true)}
            >
              {(profile as any)?.profile_image ? (
                <img
                  src={(profile as any).profile_image}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-primary-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-primary-foreground">
                  {user ? displayName : 'Guest User'}
                </h1>
                {user && userRole && userRole.role !== 'customer' && (
                  <Badge variant="secondary" className="text-xs bg-primary-foreground/20 text-primary-foreground border-0">
                    {userRole.role.charAt(0).toUpperCase() + userRole.role.slice(1)}
                  </Badge>
                )}
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground/80 hover:bg-primary-foreground/20 h-8 w-8"
                    onClick={() => setEditProfileOpen(true)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-primary-foreground/80">
                {formatPhone(user?.phone)}
              </p>
              {profile?.email && (
                <p className="text-xs text-primary-foreground/60">{profile.email}</p>
              )}
              {!user && !authLoading && (
                <Button
                  variant="glass"
                  size="sm"
                  className="mt-2 text-primary-foreground border-primary-foreground/30"
                  onClick={handleLogin}
                >
                  Sign In / Register
                </Button>
              )}
            </div>
          </div>

          {user && (
            <div className="bg-primary-foreground/20 rounded-xl">
              <NotificationBell onClick={() => setNotificationsSheetOpen(true)} />
            </div>
          )}
        </motion.div>
      </header>

      {/* Role-Based Dashboard Button */}
      {user && currentRoleConfig && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 -mt-8 relative z-10 mb-4"
        >
          <Card
            variant="elevated"
            className="p-4 cursor-pointer hover:shadow-card transition-all"
            onClick={() => navigate(currentRoleConfig.path)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${currentRoleConfig.bgColor} flex items-center justify-center`}>
                  <currentRoleConfig.icon className={`w-6 h-6 ${currentRoleConfig.color}`} />
                </div>
                <div>
                  <p className="font-semibold">{currentRoleConfig.label}</p>
                  <p className="text-xs text-muted-foreground">Go to your dashboard</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </motion.div>
      )}

      {/* Stats Card - Only show for customers with content */}
      {isCustomer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`px-4 relative z-10 ${!currentRoleConfig ? '-mt-8' : ''}`}
        >
          <Card variant="elevated" className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{orderCount}</p>
                <p className="text-xs text-muted-foreground">Orders</p>
              </div>
              <div className="border-x border-border">
                <p className="text-2xl font-bold text-primary">{addressCount}</p>
                <p className="text-xs text-muted-foreground">Addresses</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <p className="text-2xl font-bold text-primary">5.0</p>
                </div>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Default Address Preview - Only for customers */}
      {user && isCustomer && defaultAddress && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-4 mt-4"
        >
          <Card
            variant="elevated"
            className="p-4 cursor-pointer"
            onClick={() => setCurrentScreen('addresses')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Default Address</p>
                  <Badge variant="secondary" className="text-[10px]">{defaultAddress.label}</Badge>
                </div>
                <p className="font-medium text-sm truncate">{defaultAddress.address_text}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </div>
          </Card>
        </motion.div>
      )}

      {/* Menu Items */}
      <div className="p-4 space-y-2">
        <AnimatePresence>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  variant="elevated"
                  className="p-4 cursor-pointer hover:shadow-card transition-all active:scale-[0.98]"
                  onClick={item.action}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <Badge variant="secondary">
                          {item.badge}
                        </Badge>
                      )}
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Logout - only show if logged in */}
        {user && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: menuItems.length * 0.05 }}
            className="pt-4"
          >
            <Card
              variant="elevated"
              className="p-4 cursor-pointer hover:shadow-card transition-all border-destructive/20 active:scale-[0.98]"
              onClick={handleSignOut}
            >
              <div className="flex items-center gap-3 text-destructive">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="font-medium">Log Out</span>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* App Version */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">Fast Haazir v1.0.0</p>
        <p className="text-xs text-muted-foreground">Made with ❤️ in Quetta</p>
      </div>

      {/* Edit Profile Sheet */}
      <EditProfileSheet
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
      />

      {/* Notifications Sheet */}
      <NotificationsSheet
        open={notificationsSheetOpen}
        onOpenChange={setNotificationsSheetOpen}
      />

      {/* Delete Account Dialog */}
      <DeleteAccountDialog
        open={deleteAccountOpen}
        onOpenChange={setDeleteAccountOpen}
      />

      <BottomNav />
    </div>
  );
};

export default Profile;