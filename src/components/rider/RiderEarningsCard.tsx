import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Route, TrendingUp, Loader2, Bike } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useRiderPayments, useRiderEarningsSummary } from '@/hooks/useRiderPayments';

interface RiderEarningsCardProps {
  riderId: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  completed: 'bg-blue-500/20 text-blue-500',
  paid: 'bg-green-500/20 text-green-500',
};

const RiderEarningsCard = ({ riderId }: RiderEarningsCardProps) => {
  const { data: payments, isLoading: paymentsLoading } = useRiderPayments(riderId);
  const { data: summary, isLoading: summaryLoading } = useRiderEarningsSummary(riderId);

  if (paymentsLoading || summaryLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Total Earnings</span>
              <span className="text-xl font-bold text-primary">Rs {summary?.totalEarnings || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Paid</span>
              <span className="text-xl font-bold text-green-500">Rs {summary?.paidEarnings || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Pending</span>
              <span className="text-xl font-bold text-yellow-500">Rs {summary?.pendingEarnings || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Total Distance</span>
              <span className="text-xl font-bold text-foreground">{summary?.totalDistance || 0} km</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card className="bg-card border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Recent Earnings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bike className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No earnings yet</p>
              <p className="text-xs">Complete deliveries to start earning</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payments?.slice(0, 10).map((payment, index) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={statusColors[payment.status]}>
                      {payment.status}
                    </Badge>
                    <span className="text-lg font-bold text-primary">
                      Rs {payment.final_amount}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Route className="w-3 h-3" />
                      <span>{payment.distance_km} km</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="w-3 h-3" />
                      <span>Base: Rs {payment.base_fee}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      <span>@Rs {payment.per_km_rate}/km</span>
                    </div>
                  </div>

                  {(payment.bonus > 0 || payment.penalty > 0) && (
                    <div className="mt-2 text-xs">
                      {payment.bonus > 0 && (
                        <span className="text-green-500 mr-2">+Rs {payment.bonus} bonus</span>
                      )}
                      {payment.penalty > 0 && (
                        <span className="text-red-500">-Rs {payment.penalty} penalty</span>
                      )}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-muted-foreground">
                    {format(new Date(payment.created_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RiderEarningsCard;
