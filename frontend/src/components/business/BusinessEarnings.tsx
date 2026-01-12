import { useState } from "react";
import { motion } from "framer-motion";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  Wallet,
  CreditCard,
  Percent
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useBusinessOrders,
  BusinessOrder 
} from "@/hooks/useBusinessDashboard";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";

interface BusinessEarningsProps {
  businessId: string;
  commissionRate: number;
}

export const BusinessEarnings = ({ businessId, commissionRate }: BusinessEarningsProps) => {
  const { data: orders } = useBusinessOrders(businessId);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  const now = new Date();
  
  const getPeriodOrders = () => {
    if (!orders) return [];
    
    let startDate: Date;
    switch (period) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = startOfDay(subDays(now, 7));
        break;
      case 'month':
        startDate = startOfDay(subDays(now, 30));
        break;
    }

    return orders.filter(order => 
      order.status === 'delivered' &&
      isWithinInterval(new Date(order.created_at), {
        start: startDate,
        end: endOfDay(now),
      })
    );
  };

  const periodOrders = getPeriodOrders();
  const grossEarnings = periodOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const commission = grossEarnings * (commissionRate / 100);
  const netEarnings = grossEarnings - commission;
  const deliveryFees = periodOrders.reduce((sum, o) => sum + o.delivery_fee, 0);

  // Daily breakdown for charts
  const getDailyBreakdown = () => {
    const days = period === 'today' ? 1 : period === 'week' ? 7 : 30;
    const breakdown = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dayOrders = orders?.filter(o => 
        o.status === 'delivered' &&
        isWithinInterval(new Date(o.created_at), {
          start: startOfDay(date),
          end: endOfDay(date),
        })
      ) || [];
      
      const earnings = dayOrders.reduce((sum, o) => sum + (o.subtotal * (1 - commissionRate / 100)), 0);
      
      breakdown.push({
        date: format(date, 'MMM d'),
        earnings,
        orders: dayOrders.length,
      });
    }
    
    return breakdown;
  };

  const dailyBreakdown = getDailyBreakdown();
  const maxEarnings = Math.max(...dailyBreakdown.map(d => d.earnings), 1);

  // Calculate trend
  const previousPeriodOrders = (() => {
    if (!orders) return [];
    
    let startDate: Date;
    let endDate: Date;
    
    switch (period) {
      case 'today':
        startDate = startOfDay(subDays(now, 1));
        endDate = endOfDay(subDays(now, 1));
        break;
      case 'week':
        startDate = startOfDay(subDays(now, 14));
        endDate = endOfDay(subDays(now, 7));
        break;
      case 'month':
        startDate = startOfDay(subDays(now, 60));
        endDate = endOfDay(subDays(now, 30));
        break;
    }

    return orders.filter(order => 
      order.status === 'delivered' &&
      isWithinInterval(new Date(order.created_at), {
        start: startDate,
        end: endDate,
      })
    );
  })();

  const previousEarnings = previousPeriodOrders.reduce((sum, o) => sum + (o.subtotal * (1 - commissionRate / 100)), 0);
  const trend = previousEarnings > 0 
    ? ((netEarnings - previousEarnings) / previousEarnings) * 100 
    : 0;

  const exportCSV = () => {
    const headers = ['Date', 'Order ID', 'Subtotal', 'Commission', 'Net Earnings'];
    const rows = periodOrders.map(o => [
      format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
      o.id,
      o.subtotal,
      (o.subtotal * commissionRate / 100).toFixed(0),
      (o.subtotal * (1 - commissionRate / 100)).toFixed(0),
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earnings-${period}-${format(now, 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Earnings</h2>
          <p className="text-muted-foreground">Track your revenue and payouts</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Period Selector */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
        <TabsList className="grid w-full grid-cols-3 max-w-sm">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="gradient-primary text-primary-foreground">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-5 w-5" />
                <span className="text-sm opacity-80">Net Earnings</span>
              </div>
              <p className="text-2xl font-bold">PKR {netEarnings.toLocaleString()}</p>
              {trend !== 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {trend > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}% vs previous
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Gross Sales</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                PKR {grossEarnings.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                {periodOrders.length} orders
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="h-5 w-5 text-destructive" />
                <span className="text-sm text-muted-foreground">Commission</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                PKR {commission.toLocaleString()}
              </p>
              <Badge variant="secondary" className="mt-1">
                {commissionRate}% rate
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Avg Order</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                PKR {periodOrders.length > 0 
                  ? Math.round(grossEarnings / periodOrders.length).toLocaleString()
                  : 0}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Earnings Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dailyBreakdown.map((day, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="w-16 text-sm text-muted-foreground">{day.date}</span>
                <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(day.earnings / maxEarnings) * 100}%` }}
                    transition={{ delay: index * 0.05, duration: 0.5 }}
                    className="h-full gradient-primary rounded-lg"
                  />
                </div>
                <span className="w-24 text-sm font-medium text-right">
                  PKR {day.earnings.toLocaleString()}
                </span>
                <Badge variant="secondary" className="w-16 justify-center">
                  {day.orders} orders
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {periodOrders.length > 0 ? (
            <div className="space-y-3">
              {periodOrders.slice(0, 10).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      Order #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(order.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-accent">
                      +PKR {Math.round(order.subtotal * (1 - commissionRate / 100)).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      -{commissionRate}% commission
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No completed orders in this period
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
