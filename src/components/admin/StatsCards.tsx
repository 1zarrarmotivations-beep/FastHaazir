import { motion } from "framer-motion";
import { 
  ShoppingBag, 
  DollarSign, 
  Bike, 
  Store,
  TrendingUp,
  Users,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend
} from "recharts";

interface StatsCardsProps {
  stats: {
    totalOrders: number;
    totalRevenue: number;
    activeRiders: number;
    onlineRiders: number;
    activeBusinesses: number;
    totalRiders: number;
    totalBusinesses: number;
    restaurantCount?: number;
    groceryCount?: number;
    bakeryCount?: number;
    shopCount?: number;
    pendingOrders?: number;
    preparingOrders?: number;
    onWayOrders?: number;
    deliveredOrders?: number;
  } | undefined;
  isLoading: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#f59e0b', '#3b82f6'];
const ORDER_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  // Calculate rider earnings (70% of delivery fees)
  const riderEarnings = Math.round((stats?.totalRevenue || 0) * 0.7);
  const platformEarnings = Math.round((stats?.totalRevenue || 0) * 0.3);

  const businessTypeData = [
    { name: 'Restaurants', value: stats?.restaurantCount || 0, color: COLORS[0] },
    { name: 'Grocery', value: stats?.groceryCount || 0, color: COLORS[1] },
    { name: 'Bakery', value: stats?.bakeryCount || 0, color: COLORS[2] },
    { name: 'Shops', value: stats?.shopCount || 0, color: COLORS[3] },
  ].filter(item => item.value > 0);

  const orderStatusData = [
    { name: 'Pending', value: stats?.pendingOrders || 0, color: ORDER_COLORS[0] },
    { name: 'Preparing', value: stats?.preparingOrders || 0, color: ORDER_COLORS[1] },
    { name: 'On Way', value: stats?.onWayOrders || 0, color: ORDER_COLORS[2] },
    { name: 'Delivered', value: stats?.deliveredOrders || 0, color: ORDER_COLORS[3] },
  ];

  const mainCards = [
    {
      title: "Total Orders",
      value: stats?.totalOrders || 0,
      icon: ShoppingBag,
      color: "from-primary to-orange-600",
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Total Revenue",
      value: `PKR ${stats?.totalRevenue?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: "from-accent to-emerald-600",
      bgColor: "bg-accent/10",
      iconColor: "text-accent",
    },
    {
      title: "Riders Earnings (70%)",
      value: `PKR ${riderEarnings.toLocaleString()}`,
      subtitle: "Total payable to riders",
      icon: Bike,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      title: "Platform Revenue (30%)",
      value: `PKR ${platformEarnings.toLocaleString()}`,
      subtitle: "Fast Haazir profit",
      icon: TrendingUp,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
      iconColor: "text-purple-500",
    },
  ];

  const secondaryCards = [
    {
      title: "Active Riders",
      value: `${stats?.onlineRiders || 0}`,
      subtitle: `${stats?.activeRiders || 0} total active`,
      icon: Bike,
      bgColor: "bg-accent/10",
      iconColor: "text-accent",
    },
    {
      title: "Total Riders",
      value: stats?.totalRiders || 0,
      icon: Users,
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      title: "Active Businesses",
      value: stats?.activeBusinesses || 0,
      subtitle: `${stats?.totalBusinesses || 0} total`,
      icon: Store,
      bgColor: "bg-purple-500/10",
      iconColor: "text-purple-500",
    },
    {
      title: "Pending Orders",
      value: stats?.pendingOrders || 0,
      icon: Clock,
      bgColor: "bg-amber-500/10",
      iconColor: "text-amber-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-card transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">
                        {card.title}
                      </p>
                      <p className="text-2xl font-bold mt-1 text-foreground">
                        {card.value}
                      </p>
                      {card.subtitle && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {card.subtitle}
                        </p>
                      )}
                    </div>
                    <div className={`p-3 rounded-xl ${card.bgColor}`}>
                      <Icon className={`w-6 h-6 ${card.iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {secondaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.title}</p>
                    {card.subtitle && (
                      <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Orders by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orderStatusData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {orderStatusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Business Type Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                Businesses by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                {businessTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={businessTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {businessTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground">No businesses yet</p>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {businessTypeData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Revenue Split Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Revenue Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-xl bg-background/50">
                <p className="text-3xl font-bold text-foreground">
                  PKR {stats?.totalRevenue?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Total Revenue</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-blue-500/10">
                <p className="text-3xl font-bold text-blue-500">
                  PKR {riderEarnings.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Riders (70%)</p>
                <p className="text-xs text-muted-foreground">Payable to delivery partners</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-accent/10">
                <p className="text-3xl font-bold text-accent">
                  PKR {platformEarnings.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Platform (30%)</p>
                <p className="text-xs text-muted-foreground">Fast Haazir revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
