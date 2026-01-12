import { motion } from "framer-motion";
import { 
  ShoppingBag, 
  DollarSign, 
  Clock, 
  Star,
  UtensilsCrossed,
  TrendingUp
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { BusinessStats } from "@/hooks/useBusinessDashboard";
import { Skeleton } from "@/components/ui/skeleton";

interface BusinessStatsCardsProps {
  stats: BusinessStats | null | undefined;
  isLoading: boolean;
}

export const BusinessStatsCards = ({ stats, isLoading }: BusinessStatsCardsProps) => {
  const statCards = [
    {
      label: "Today's Orders",
      value: stats?.todayOrders || 0,
      icon: ShoppingBag,
      color: 'from-primary to-orange-600',
      bgColor: 'bg-primary/10',
    },
    {
      label: "Today's Earnings",
      value: `PKR ${(stats?.todayEarnings || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'from-accent to-emerald-600',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Pending Orders',
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Average Rating',
      value: stats?.averageRating?.toFixed(1) || '0.0',
      icon: Star,
      color: 'from-yellow-500 to-amber-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Menu Items',
      value: stats?.menuItemsCount || 0,
      icon: UtensilsCrossed,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Completion Rate',
      value: stats?.totalOrders ? `${((stats.completedOrders / stats.totalOrders) * 100).toFixed(0)}%` : '0%',
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-10 w-10 rounded-xl mb-3" />
            <Skeleton className="h-6 w-16 mb-1" />
            <Skeleton className="h-4 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4 hover:shadow-card transition-shadow duration-200">
              <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center mb-3`}>
                <Icon className={`h-5 w-5 bg-gradient-to-r ${stat.color} bg-clip-text`} style={{ color: 'inherit' }} />
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
