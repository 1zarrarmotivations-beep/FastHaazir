import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useAdmin";
import { 
  useMyBusiness, 
  useBusinessStats 
} from "@/hooks/useBusinessDashboard";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { BusinessDashboardHome } from "@/components/business/BusinessDashboardHome";
import { BusinessMenuManager } from "@/components/business/BusinessMenuManager";
import { BusinessOrdersManager } from "@/components/business/BusinessOrdersManager";
import { BusinessEarnings } from "@/components/business/BusinessEarnings";
import { BusinessProfile } from "@/components/business/BusinessProfile";
import { BusinessSettings } from "@/components/business/BusinessSettings";
import { BusinessNotifications } from "@/components/business/BusinessNotifications";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  const { data: business, isLoading: businessLoading } = useMyBusiness();
  const { data: stats, isLoading: statsLoading } = useBusinessStats(business?.id);
  
  const [activeTab, setActiveTab] = useState('dashboard');

  // Enable real-time sync for all orders and stats
  useRealtimeOrders();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || roleLoading || businessLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏪</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have access to the business dashboard. Please contact admin if you believe this is an error.
          </p>
          <button
            onClick={() => navigate('/')}
            className="gradient-primary text-primary-foreground px-6 py-2 rounded-xl font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <BusinessDashboardHome 
            business={business} 
            stats={stats} 
            statsLoading={statsLoading}
            onTabChange={setActiveTab}
          />
        );
      case 'menu':
        return <BusinessMenuManager businessId={business.id} businessType={business.type} />;
      case 'orders':
        return <BusinessOrdersManager businessId={business.id} />;
      case 'earnings':
        return <BusinessEarnings businessId={business.id} commissionRate={business.commission_rate} />;
      case 'profile':
        return <BusinessProfile business={business} />;
      case 'notifications':
        return <BusinessNotifications />;
      case 'settings':
        return <BusinessSettings business={business} />;
      default:
        return <BusinessDashboardHome 
          business={business} 
          stats={stats} 
          statsLoading={statsLoading}
          onTabChange={setActiveTab}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <BusinessSidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        business={business}
      />
      
      <main className="flex-1 lg:ml-0 min-h-screen">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default BusinessDashboard;