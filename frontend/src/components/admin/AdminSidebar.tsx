import {
  LayoutDashboard,
  Users,
  Store,
  ShoppingBag,
  Bike,
  MapPin,
  LogOut,
  Menu,
  X,
  DollarSign,
  UserCog,
  User,
  UserX,
  Bell,
  Settings,
  Send,
  MessageCircle,
  Sparkles,
  Wallet,
  Tag,
  BarChart3,
  Headphones,
  FileText,
  ArrowUpCircle,
  TrendingUp,
  CreditCard
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAdminSupportTickets } from "@/hooks/useAdminSupport";
import { useUnreadRiderTicketsCount } from "@/hooks/useAdminRiderSupport";
import { useUserRole } from "@/hooks/useAdmin";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuGroups = [
  {
    title: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "live-map", label: "Live Map", icon: MapPin },
    ]
  },
  {
    title: "Operations",
    items: [
      { id: "orders", label: "Orders", icon: ShoppingBag },
      { id: "businesses", label: "Businesses", icon: Store },
      { id: "users", label: "Users & Roles", icon: UserCog },
      { id: "deletion-requests", label: "Deletion Requests", icon: UserX },
    ]
  },
  {
    title: "Rider Ecosystem",
    items: [
      { id: "riders", label: "Riders", icon: Bike },
      { id: "rider-applications", label: "Applications", icon: User },
      { id: "requests", label: "Ride Requests", icon: Users },
      { id: "rider-support", label: "Rider Support", icon: Headphones, badgeId: "rider-support" },
      { id: "earnings", label: "Rider Earnings", icon: TrendingUp },
    ]
  },
  {
    title: "Finance & Strategy",
    items: [
      { id: "wallet-adjustments", label: "Cash Advances", icon: ArrowUpCircle },
      { id: "withdrawals", label: "Withdrawals", icon: CreditCard },
      { id: "category-pricing", label: "Global Pricing", icon: DollarSign },
      { id: "payment-settings", label: "Finance Settings", icon: Settings },
    ]
  },
  {
    title: "Comms & Help",
    items: [
      { id: "support", label: "Customer Support", icon: Headphones, badgeId: "support" },
      { id: "chats", label: "Direct Messages", icon: MessageCircle },
      { id: "notifications", label: "System Alerts", icon: Bell },
      { id: "push-notifications", label: "Push Center", icon: Send },
      { id: "promo-banner", label: "Marketing Banners", icon: Sparkles },
      { id: "explore-control", label: "Discovery Engine", icon: LayoutDashboard },
    ]
  }
];

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await signOut(navigate);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("[AdminSidebar] Logout error:", error);
      toast.error("Logout failed");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const { data: supportTickets } = useAdminSupportTickets();
  const { data: riderSupportCount } = useUnreadRiderTicketsCount();

  const getBadgeCount = (badgeId?: string) => {
    if (badgeId === "support") {
      return supportTickets?.filter(t => t.status === "open").length || 0;
    }
    if (badgeId === "rider-support") {
      return riderSupportCount || 0;
    }
    return 0;
  };

  const { data: userRole } = useUserRole();

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface text-textPrimary shadow-lg border border-border"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-72 bg-background border-r border-border transition-all duration-300 flex flex-col shadow-2xl",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-6 pb-2">
          <div className="flex items-center gap-4 bg-surface p-4 rounded-2xl border border-border shadow-inner">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Bike className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-textPrimary tracking-tight leading-tight">Fast Haazir</h1>
              <p className="text-[10px] text-textSecondary font-medium uppercase tracking-wider">Admin Workspace</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto scrollbar-hide">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <h3 className="px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 font-mono">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all duration-200 group relative",
                        isActive
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "text-textSecondary hover:text-textPrimary hover:bg-surface"
                      )}
                    >
                      <Icon className={cn("w-4.5 h-4.5 transition-colors", isActive ? "text-white" : "text-textSecondary group-hover:text-textPrimary")} />
                      <span className={cn("text-sm font-medium flex-1", isActive ? "font-semibold" : "")}>{item.label}</span>

                      {getBadgeCount(item.badgeId) > 0 && (
                        <Badge
                          variant="destructive"
                          className={cn(
                            "h-5 min-w-5 flex items-center justify-center text-[10px] font-bold px-1.5 rounded-full border-2",
                            isActive ? "bg-white text-primary border-primary" : "bg-red-500 text-white border-background"
                          )}
                        >
                          {getBadgeCount(item.badgeId)}
                        </Badge>
                      )}

                      {isActive && !getBadgeCount(item.badgeId) && (
                        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border bg-background">
          <div className={cn(
            "bg-surface rounded-xl p-1 border border-border shadow-sm",
            userRole?.role === 'super_admin' && "border-primary/30 ring-1 ring-primary/10 shadow-[0_0_15px_-5px_rgba(15,92,58,0.2)]"
          )}>
            <div className="flex items-center gap-3 p-2 mb-1">
              <div className={cn(
                "w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-emerald-500 ring-2 ring-background",
                userRole?.role === 'super_admin' && "from-amber-400 via-primary to-emerald-500"
              )}></div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-sm font-bold text-textPrimary truncate capitalize">{userRole?.name || (userRole?.role === 'super_admin' ? 'Master Admin' : 'Admin')}</p>
                  {userRole?.role === 'super_admin' && (
                    <Sparkles className="w-3 h-3 text-primary animate-pulse shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {userRole?.role === 'super_admin' ? (
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                      <p className="text-[9px] text-primary font-bold uppercase tracking-wider">God Mode Enabled</p>
                    </div>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <p className="text-[10px] text-textSecondary truncate uppercase tracking-wider">Online</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full justify-center gap-2 h-8 text-xs text-error hover:text-error/80 hover:bg-error/10 rounded-lg transition-colors"
              size="sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
