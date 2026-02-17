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
      { id: "requests", label: "Registration", icon: Users },
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

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#1a1a1a] text-white shadow-lg border border-white/10"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-72 bg-[#141414] border-r border-white/5 transition-transform duration-300 flex flex-col shadow-2xl",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo Area */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-4 bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 shadow-inner">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <Bike className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight leading-tight">Fast Haazir</h1>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Admin Workspace</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
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
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Icon className={cn("w-4.5 h-4.5 transition-colors", isActive ? "text-white" : "text-gray-500 group-hover:text-white")} />
                      <span className={cn("text-sm font-medium flex-1", isActive ? "font-semibold" : "")}>{item.label}</span>

                      {getBadgeCount(item.badgeId) > 0 && (
                        <Badge
                          variant="destructive"
                          className={cn(
                            "h-5 min-w-5 flex items-center justify-center text-[10px] font-bold px-1.5 rounded-full border-2",
                            isActive ? "bg-white text-orange-500 border-orange-500" : "bg-red-500 text-white border-[#141414]"
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

        {/* User / Logout */}
        <div className="p-4 border-t border-white/5 bg-[#0a0a0a]">
          <div className="bg-[#1a1a1a] rounded-xl p-1 border border-white/5">
            <div className="flex items-center gap-3 p-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-red-500 ring-2 ring-[#0a0a0a]"></div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-white truncate">Super Admin</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <p className="text-[10px] text-gray-400 truncate uppercase tracking-wider">Online</p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full justify-center gap-2 h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
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
