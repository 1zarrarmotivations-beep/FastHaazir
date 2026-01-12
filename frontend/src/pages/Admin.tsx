import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin, useAdminStats } from "@/hooks/useAdmin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { StatsCards } from "@/components/admin/StatsCards";
import { RidersManager } from "@/components/admin/RidersManager";
import { BusinessesManager } from "@/components/admin/BusinessesManager";
import { OrdersManager } from "@/components/admin/OrdersManager";
import { RiderRequestsManager } from "@/components/admin/RiderRequestsManager";
import { LiveRidersMap } from "@/components/admin/LiveRidersMap";
import { UsersManager } from "@/components/admin/UsersManager";
import { SystemNotifications } from "@/components/admin/SystemNotifications";
import RiderPaymentsManager from "@/components/admin/RiderPaymentsManager";
import PaymentSettingsManager from "@/components/admin/PaymentSettingsManager";
import PushNotificationCenter from "@/components/admin/PushNotificationCenter";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <ShieldX className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-center mb-6">
          You don't have permission to access the admin panel.
        </p>
        <Button onClick={() => navigate("/")} className="gradient-primary text-primary-foreground">
          Go Home
        </Button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
              <p className="text-muted-foreground">Overview of Fast Haazir operations</p>
            </div>
            <StatsCards stats={stats} isLoading={statsLoading} />
          </div>
        );
      case "users":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Users & Roles</h2>
              <p className="text-muted-foreground">Manage phone numbers and role-based access</p>
            </div>
            <UsersManager />
          </div>
        );
      case "riders":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Riders Management</h2>
              <p className="text-muted-foreground">Create and manage delivery riders</p>
            </div>
            <RidersManager />
          </div>
        );
      case "earnings":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Rider Payments</h2>
              <p className="text-muted-foreground">Manage payment settings and track all rider earnings</p>
            </div>
            <RiderPaymentsManager />
          </div>
        );
      case "businesses":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Businesses Management</h2>
              <p className="text-muted-foreground">Manage restaurants, grocery stores, and bakeries</p>
            </div>
            <BusinessesManager />
          </div>
        );
      case "orders":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Orders Management</h2>
              <p className="text-muted-foreground">View and manage all customer orders</p>
            </div>
            <OrdersManager />
          </div>
        );
      case "requests":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Rider Requests</h2>
              <p className="text-muted-foreground">Manage on-demand rider delivery requests</p>
            </div>
            <RiderRequestsManager />
          </div>
        );
      case "live-map":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Live Riders Map</h2>
              <p className="text-muted-foreground">Real-time location of all riders</p>
            </div>
            <LiveRidersMap />
          </div>
        );
      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">System Notifications</h2>
              <p className="text-muted-foreground">Send notifications to customers</p>
            </div>
            <SystemNotifications />
          </div>
        );
      case "push-notifications":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Push Notification Center</h2>
              <p className="text-muted-foreground">Send real push notifications to users</p>
            </div>
            <PushNotificationCenter />
          </div>
        );
      case "payment-settings":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Payment Settings</h2>
              <p className="text-muted-foreground">Configure rider payment rates</p>
            </div>
            <PaymentSettingsManager />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 lg:ml-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
