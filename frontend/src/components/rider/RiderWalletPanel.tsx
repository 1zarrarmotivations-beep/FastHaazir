import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Gift,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Navigation,
  ArrowUpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRiderPayments, useRiderEarningsSummary } from '@/hooks/useRiderPayments';
import { useRiderWalletSummary } from '@/hooks/useWalletAdjustments';
import { format, isToday, isThisWeek, isThisMonth, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import WithdrawalRequestPanel from './WithdrawalRequestPanel';
import WalletLedgerSection from './WalletLedgerSection';

interface RiderWalletPanelProps {
  riderId: string;
  isOpen: boolean;
  onClose: () => void;
}

type TimeRange = 'today' | 'week' | 'month' | 'all';

const RiderWalletPanel = ({ riderId, isOpen, onClose }: RiderWalletPanelProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const { data: payments = [], isLoading: paymentsLoading } = useRiderPayments(riderId);
  const { data: summary, isLoading: summaryLoading } = useRiderEarningsSummary(riderId);
  const { data: walletSummary } = useRiderWalletSummary(riderId);

  // Filter payments by time range
  const filteredPayments = payments.filter(payment => {
    const date = new Date(payment.created_at);
    switch (timeRange) {
      case 'today':
        return isToday(date);
      case 'week':
        return isThisWeek(date);
      case 'month':
        return isThisMonth(date);
      default:
        return true;
    }
  });

  // Calculate earnings for time range
  const rangeEarnings = filteredPayments.reduce((sum, p) => sum + (p.final_amount || 0), 0);
  const rangeBonuses = filteredPayments.reduce((sum, p) => sum + (p.bonus || 0), 0);
  const rangeDeliveries = filteredPayments.length;
  const rangeDistance = filteredPayments.reduce((sum, p) => sum + (p.distance_km || 0), 0);

  const statusConfig = {
    pending: { label: 'Pending', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock },
    completed: { label: 'Completed', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: CheckCircle },
    paid: { label: 'Paid', color: 'text-accent', bg: 'bg-accent/10', icon: CheckCircle },
  };

  // Open Google Maps for navigation
  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  if (!isOpen) return null;

  if (showWithdrawal) {
    return (
      <WithdrawalRequestPanel 
        riderId={riderId} 
        isOpen={showWithdrawal} 
        onClose={() => setShowWithdrawal(false)} 
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-accent/20 via-accent/10 to-background p-4 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Wallet & Earnings</h2>
              <p className="text-sm text-muted-foreground">Track your income</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Balance Card */}
        <Card className="gradient-primary text-primary-foreground p-5 rounded-2xl shadow-elevated">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm opacity-80">Total Balance</p>
            {(walletSummary?.cashAdvances || 0) > 0 && (
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                <ArrowUpCircle className="w-3 h-3 mr-1" />
                +Rs {walletSummary?.cashAdvances} advance
              </Badge>
            )}
          </div>
          <p className="text-4xl font-bold mb-2">Rs {walletSummary?.netBalance || summary?.pendingEarnings || 0}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm opacity-80">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Earnings: Rs {summary?.totalEarnings || 0}
            </span>
            {(walletSummary?.cashAdvances || 0) > 0 && (
              <span className="flex items-center gap-1">
                <ArrowUpCircle className="w-4 h-4" />
                Advances: Rs {walletSummary?.cashAdvances}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Paid: Rs {summary?.paidEarnings || 0}
            </span>
          </div>
        </Card>
      </div>

      <div className="p-4 space-y-4">
        {/* Withdraw Button */}
        <Button 
          onClick={() => setShowWithdrawal(true)}
          className="w-full bg-accent hover:bg-accent/90"
          size="lg"
        >
          <ArrowUpRight className="w-5 h-5 mr-2" />
          Request Withdrawal
        </Button>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {(['today', 'week', 'month', 'all'] as TimeRange[]).map(range => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="flex-1 capitalize"
            >
              {range === 'all' ? 'All Time' : range}
            </Button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center">
            <DollarSign className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">Rs {rangeEarnings}</p>
            <p className="text-xs text-muted-foreground">Earned</p>
          </Card>
          <Card className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-accent mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{rangeDeliveries}</p>
            <p className="text-xs text-muted-foreground">Deliveries</p>
          </Card>
          <Card className="p-4 text-center">
            <Navigation className="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">{rangeDistance.toFixed(1)} km</p>
            <p className="text-xs text-muted-foreground">Distance</p>
          </Card>
          <Card className="p-4 text-center">
            <Gift className="w-5 h-5 text-orange-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">Rs {rangeBonuses}</p>
            <p className="text-xs text-muted-foreground">Bonuses</p>
          </Card>
        </div>

        {/* Admin Credits & Adjustments */}
        <WalletLedgerSection riderId={riderId} />

        {/* Transaction History */}
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Transaction History
          </h3>

          {paymentsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <Card className="p-8 text-center">
              <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No transactions for this period</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPayments.map((payment, index) => {
                const status = statusConfig[payment.status as keyof typeof statusConfig] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center`}>
                          <ArrowDownLeft className={`w-5 h-5 ${status.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-foreground">Delivery Earning</p>
                            <p className="font-bold text-accent">+Rs {payment.final_amount}</p>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {payment.distance_km.toFixed(1)} km • Rs {payment.base_fee} + Rs {payment.per_km_rate}/km
                            </span>
                            <Badge className={`${status.bg} ${status.color} border-0 text-xs`}>
                              {status.label}
                            </Badge>
                          </div>
                          {(payment.bonus > 0 || payment.penalty > 0) && (
                            <div className="mt-1 text-xs">
                              {payment.bonus > 0 && (
                                <span className="text-accent mr-2">+Rs {payment.bonus} bonus</span>
                              )}
                              {payment.penalty > 0 && (
                                <span className="text-destructive">-Rs {payment.penalty} penalty</span>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(payment.created_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Spacer for bottom nav */}
        <div className="h-20" />
      </div>
    </motion.div>
  );
};

export default RiderWalletPanel;
