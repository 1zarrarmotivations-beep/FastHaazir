import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingBag, 
  DollarSign, 
  Bike, 
  Store,
  TrendingUp,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface EnhancedStatsCardsProps {
  stats: {
    totalOrders: number;
    totalRevenue: number;
    activeRiders: number;
    onlineRiders: number;
    activeBusinesses: number;
    pendingOrders?: number;
    preparingOrders?: number;
    onWayOrders?: number;
    deliveredOrders?: number;
  } | undefined;
  isLoading: boolean;
}

interface StatCard {
  title: string;
  value: number;
  icon: any;
  gradient: string;
  trend?: number;
  prefix?: string;
  suffix?: string;
}

export function EnhancedStatsCards({ stats, isLoading }: EnhancedStatsCardsProps) {
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});

  // Animate number changes
  useEffect(() => {
    if (!stats) return;

    const animate = (key: string, target: number) => {
      const start = animatedValues[key] || 0;
      const duration = 1000;
      const startTime = Date.now();

      const step = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        const value = Math.floor(start + (target - start) * progress);
        
        setAnimatedValues(prev => ({ ...prev, [key]: value }));

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    };

    animate('totalOrders', stats.totalOrders || 0);
    animate('totalRevenue', stats.totalRevenue || 0);
    animate('activeRiders', stats.activeRiders || 0);
    animate('onlineRiders', stats.onlineRiders || 0);
    animate('activeBusinesses', stats.activeBusinesses || 0);
    animate('pendingOrders', stats.pendingOrders || 0);
  }, [stats]);

  const mainCards: StatCard[] = [
    {
      title: "Total Orders Today",
      value: animatedValues.totalOrders || 0,
      icon: ShoppingBag,
      gradient: "from-orange-500 to-red-500",
    },
    {
      title: "Revenue",
      value: animatedValues.totalRevenue || 0,
      icon: DollarSign,
      gradient: "from-green-500 to-emerald-600",
      prefix: "Rs. ",
    },
    {
      title: "Online Riders",
      value: animatedValues.onlineRiders || 0,
      icon: Bike,
      gradient: "from-blue-500 to-cyan-500",
      suffix: ` / ${stats?.activeRiders || 0}`,
    },
    {
      title: "Active Businesses",
      value: animatedValues.activeBusinesses || 0,
      icon: Store,
      gradient: "from-purple-500 to-pink-500",
    },
  ];

  const orderStatusCards: StatCard[] = [
    {
      title: "Pending",
      value: animatedValues.pendingOrders || 0,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      title: "Preparing",
      value: stats?.preparingOrders || 0,
      icon: AlertCircle,
      gradient: "from-blue-500 to-indigo-500",
    },
    {
      title: "On Way",
      value: stats?.onWayOrders || 0,
      icon: Truck,
      gradient: "from-purple-500 to-violet-500",
    },
    {
      title: "Delivered",
      value: stats?.deliveredOrders || 0,
      icon: CheckCircle,
      gradient: "from-green-500 to-teal-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatePresence mode="wait">
          {mainCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                      <card.icon className="w-6 h-6 text-white" />
                    </div>
                    {card.title === "Pending" && card.value > 0 && (
                      <Badge variant="destructive" className="animate-pulse">
                        New
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {card.prefix}
                      <motion.span
                        key={card.value}
                        initial={{ scale: 1.2, color: "#10b981" }}
                        animate={{ scale: 1, color: "inherit" }}
                        transition={{ duration: 0.3 }}
                      >
                        {card.value.toLocaleString()}
                      </motion.span>
                      {card.suffix}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Order Status Cards */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Order Status Overview</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {orderStatusCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <Card className="relative overflow-hidden hover:shadow-md transition-shadow border-0">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-5`}></div>
                <CardContent className="p-4 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient} bg-opacity-10`}>
                        <card.icon className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
                        <p className="text-2xl font-bold text-foreground">{card.value}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Live Orders Alert */}
      {(stats?.pendingOrders || 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Card className="bg-gradient-to-r from-orange-500 to-red-500 border-0 shadow-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-white">
                <div className="relative">
                  <AlertCircle className="w-6 h-6 animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping"></span>
                </div>
                <div>
                  <p className="font-semibold">{stats.pendingOrders} New Orders!</p>
                  <p className="text-sm opacity-90">Awaiting your action</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
