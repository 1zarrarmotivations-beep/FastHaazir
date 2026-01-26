import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ClipboardList, 
  TrendingUp, 
  Settings, 
  LogOut,
  Menu,
  X,
  Store,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { BusinessProfile } from "@/hooks/useBusinessDashboard";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationsSheet from "@/components/notifications/NotificationsSheet";
import { toast } from "sonner";

interface BusinessSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  business: BusinessProfile | null;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'menu', label: 'Menu Management', icon: UtensilsCrossed },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'earnings', label: 'Earnings', icon: TrendingUp },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Business Profile', icon: Store },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const BusinessSidebar = ({ activeTab, onTabChange, business }: BusinessSidebarProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    
    try {
      await signOut(navigate);
      toast.success("لاگ آؤٹ ہو گیا");
    } catch (error) {
      console.error("[BusinessSidebar] Logout error:", error);
      toast.error("Logout failed");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const businessTypeIcons: Record<string, string> = {
    restaurant: '🍽️',
    bakery: '🥐',
    grocery: '🛒',
    shop: '🏪',
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-card shadow-soft"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <div className="bg-card shadow-soft rounded-lg">
          <NotificationBell onClick={() => setNotificationsOpen(true)} />
        </div>
      </div>

      {/* Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Business Info */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-2xl">
                {business?.type ? businessTypeIcons[business.type] : '🏪'}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-foreground truncate">
                  {business?.name || 'My Business'}
                </h1>
                <p className="text-xs text-muted-foreground capitalize">
                  {business?.type || 'Business'} Dashboard
                </p>
              </div>
            </div>
            {business && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rating:</span>
                <span className="text-sm font-semibold text-primary">⭐ {business.rating}</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'gradient-primary text-primary-foreground shadow-elevated'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="h-5 w-5" />
              <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
            </Button>
          </div>
        </div>
      </aside>

      <NotificationsSheet 
        open={notificationsOpen} 
        onOpenChange={setNotificationsOpen} 
      />
    </>
  );
};
