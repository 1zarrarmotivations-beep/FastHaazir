import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin, useAdminStats } from "@/hooks/useAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import ModernAdminDashboard from "@/components/admin/ModernAdminDashboard";
import { RidersManager } from "@/components/admin/RidersManager";
import { BusinessesManager } from "@/components/admin/BusinessesManager";
import { OrdersManager } from "@/components/admin/OrdersManager";
import { RiderRequestsManager } from "@/components/admin/RiderRequestsManager";
import { RiderApplicationsManager } from "@/components/admin/RiderApplicationsManager";
import { LiveRidersMap } from "@/components/admin/LiveRidersMap";
import { UsersManager } from "@/components/admin/UsersManager";
import { SystemNotifications } from "@/components/admin/SystemNotifications";
import RiderPaymentsManager from "@/components/admin/RiderPaymentsManager";
import PaymentSettingsManager from "@/components/admin/PaymentSettingsManager";
import EnhancedPaymentSettings from "@/components/admin/EnhancedPaymentSettings";
import WithdrawalsManager from "@/components/admin/WithdrawalsManager";
import WalletAdjustmentsManager from "@/components/admin/WalletAdjustmentsManager";
import CategoryPricingManager from "@/components/admin/CategoryPricingManager";
import PushNotificationCenter from "@/components/admin/PushNotificationCenter";
import AdminChatsManager from "@/components/admin/AdminChatsManager";
import BannersManager from "@/components/admin/BannersManager";
import { EnhancedSupportTicketsManager } from "@/components/admin/EnhancedSupportTicketsManager";
import RiderSupportTicketsManager from "@/components/admin/RiderSupportTicketsManager";
import { DeletionRequestsManager } from "@/components/admin/DeletionRequestsManager";
import AdminRiderSupportNotificationBadge from "@/components/admin/AdminRiderSupportNotificationBadge";
import ExploreControl from "@/components/admin/ExploreControl";

import AdminOrderNotificationBadge from "@/components/admin/AdminOrderNotificationBadge";
import AdminSupportNotificationBadge from "@/components/admin/AdminSupportNotificationBadge";
import LanguageToggle from "@/components/LanguageToggle";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { Loader2, ShieldX, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Admin() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);

  const handleNavigate = (tab: string, riderId?: string) => {
    setActiveTab(tab);
    if (riderId) {
      setSelectedRiderId(riderId);
    } else if (tab !== 'wallet-adjustments' && tab !== 'withdrawals') {
      // Clear selection if navigating elsewhere, unless it's a finance tab where we might want to keep it?
      // Actually, better to only clear when expressly moving to a non-finance dashboard.
    }
  };
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const navigate = useNavigate();

  // Enable real-time sync for all orders, payments, and stats
  useRealtimeOrders();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-textPrimary p-4 text-center">
        <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center mb-6 border border-error/20">
          <ShieldX className="w-10 h-10 text-error" />
        </div>
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-textPrimary to-textSecondary">
          Restricted Access
        </h1>
        <p className="text-textSecondary max-w-md mb-8">
          This area is reserved for system administrators. If you believe this is an error, please contact support.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" className="border-border" onClick={() => navigate("/")}>
            Back to Home
          </Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => navigate("/auth")}>
            Login Again
          </Button>
        </div>
      </div>
    );
  }


  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <ModernAdminDashboard onNavigate={handleNavigate} />;

      // --- Overview ---
      case "analytics":
        return <AnalyticsDashboard />;
      case "live-map":
        return (
          <div className="space-y-6">
            <LiveRidersMap />
          </div>
        );

      // --- Management ---
      case "orders":
        return (
          <div className="space-y-6">
            <OrdersManager />
          </div>
        );
      case "businesses":
        return (
          <div className="space-y-6">
            <BusinessesManager />
          </div>
        );
      case "riders":
        return (
          <div className="space-y-6">
            <RidersManager onNavigate={handleNavigate} />
          </div>
        );
      case "rider-applications":
        return (
          <div className="space-y-6">
            <RiderApplicationsManager />
          </div>
        );
      case "users":
        return (
          <div className="space-y-6">
            <UsersManager />
          </div>
        );
      case "requests":
        return (
          <div className="space-y-6">
            <RiderRequestsManager />
          </div>
        );

      // --- Finance ---
      case "earnings":
        return (
          <div className="space-y-6">
            <RiderPaymentsManager />
          </div>
        );
      case "wallet-adjustments":
        return (
          <div className="space-y-6">
            <WalletAdjustmentsManager riderId={selectedRiderId || undefined} />
          </div>
        );
      case "withdrawals":
        return (
          <div className="space-y-6">
            <WithdrawalsManager />
          </div>
        );
      case "category-pricing":
        return (
          <div className="space-y-6">
            <CategoryPricingManager />
          </div>
        );
      case "payment-settings":
        return (
          <div className="space-y-6">
            <EnhancedPaymentSettings />
          </div>
        );

      // --- Support & Comms ---
      case "support":
        return (
          <div className="space-y-6">
            <EnhancedSupportTicketsManager />
          </div>
        );
      case "rider-support":
        return (
          <div className="space-y-6">
            <RiderSupportTicketsManager />
          </div>
        );
      case "deletion-requests":
        return (
          <div className="space-y-6">
            <DeletionRequestsManager />
          </div>
        );

      case "chats":
        return (
          <div className="space-y-6">
            <AdminChatsManager />
          </div>
        );
      case "notifications":
        return (
          <div className="space-y-6">
            <SystemNotifications />
          </div>
        );
      case "push-notifications":
        return (
          <div className="space-y-6">
            <PushNotificationCenter />
          </div>
        );
      case "promo-banner":
        return (
          <div className="space-y-6">
            <BannersManager />
          </div>
        );
      case "explore-control":
        return (
          <div className="space-y-6">
            <ExploreControl />
          </div>
        );

      default:
        // Fallback or 404 within dashboard
        return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
            <p>Module under construction: {activeTab}</p>
            <Button variant="link" onClick={() => setActiveTab("dashboard")}>Go to Dashboard</Button>
          </div>
        );
    }
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border py-3 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 flex items-center justify-between mb-8 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-textPrimary hidden md:block">
            System Status
          </h1>

          {/* Global Order Receiving Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border">
            <Activity className={`w-3 h-3 ${stats?.pendingOrders ? 'text-primary animate-pulse' : 'text-success'}`} />
            <span className="text-xs font-medium text-textSecondary uppercase tracking-wider">
              Flow: <span className={stats?.pendingOrders ? 'text-primary' : 'text-success'}>
                {stats?.pendingOrders ? `${stats.pendingOrders} Active` : 'Stable'}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <AdminRiderSupportNotificationBadge onTabChange={setActiveTab} />
            <AdminSupportNotificationBadge onTabChange={setActiveTab} />
            <AdminOrderNotificationBadge onTabChange={setActiveTab} />
          </div>
          <div className="h-6 w-px bg-border mx-1"></div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="bg-surface p-1 rounded-lg">
              <LanguageToggle variant="admin" />
            </div>
          </div>
        </div>
      </div>

      {renderContent()}
    </AdminLayout>
  );
}

