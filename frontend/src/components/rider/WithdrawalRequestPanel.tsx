import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpRight, 
  X, 
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { 
  useRiderWithdrawals, 
  useCreateWithdrawal, 
  useRiderAvailableBalance 
} from '@/hooks/useWithdrawals';
import { useRiderEarningsSummary } from '@/hooks/useRiderPayments';

interface WithdrawalRequestPanelProps {
  riderId: string;
  isOpen: boolean;
  onClose: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-500/10 text-blue-500', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-500', icon: XCircle },
  paid: { label: 'Paid', color: 'bg-green-500/10 text-green-500', icon: CreditCard },
};

const WithdrawalRequestPanel = ({ riderId, isOpen, onClose }: WithdrawalRequestPanelProps) => {
  const [amount, setAmount] = useState('');
  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useRiderWithdrawals(riderId);
  const { data: balance, isLoading: balanceLoading } = useRiderAvailableBalance(riderId);
  const { data: summary } = useRiderEarningsSummary(riderId);
  const createWithdrawal = useCreateWithdrawal();

  const availableBalance = summary?.pendingEarnings || 0;
  const pendingWithdrawals = balance?.pending || 0;
  const withdrawableAmount = Math.max(0, availableBalance - pendingWithdrawals);

  const handleSubmit = () => {
    const numAmount = Number(amount);
    if (numAmount <= 0 || numAmount > withdrawableAmount) return;
    
    createWithdrawal.mutate({
      riderId,
      amount: numAmount,
    }, {
      onSuccess: () => {
        setAmount('');
      }
    });
  };

  const handleMaxAmount = () => {
    setAmount(String(withdrawableAmount));
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-primary/20 via-primary/10 to-background p-4 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Withdraw Funds</h2>
              <p className="text-sm text-muted-foreground">Request your earnings</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-5 rounded-2xl">
          <p className="text-sm opacity-80 mb-1">Available for Withdrawal</p>
          <p className="text-4xl font-bold mb-2">Rs {withdrawableAmount}</p>
          <div className="flex items-center gap-4 text-sm opacity-80">
            <span>Total Pending: Rs {availableBalance}</span>
            {pendingWithdrawals > 0 && (
              <span className="text-yellow-200">Processing: Rs {pendingWithdrawals}</span>
            )}
          </div>
        </Card>
      </div>

      <div className="p-4 space-y-4">
        {/* Request Form */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            New Withdrawal Request
          </h3>
          
          {withdrawableAmount <= 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No funds available</p>
              <p className="text-sm">Complete more deliveries to earn</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (PKR)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    min={1}
                    max={withdrawableAmount}
                  />
                  <Button variant="outline" onClick={handleMaxAmount}>
                    Max
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Maximum: Rs {withdrawableAmount}
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={createWithdrawal.isPending || !amount || Number(amount) <= 0 || Number(amount) > withdrawableAmount}
                className="w-full"
              >
                {createWithdrawal.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Request Withdrawal
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Withdrawals are processed within 24-48 hours
              </p>
            </div>
          )}
        </Card>

        {/* Withdrawal History */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Withdrawal History
          </h3>

          {withdrawalsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : withdrawals.length === 0 ? (
            <Card className="p-8 text-center">
              <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No withdrawal requests yet</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((withdrawal, index) => {
                const status = statusConfig[withdrawal.status];
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={withdrawal.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${status.color} flex items-center justify-center`}>
                          <StatusIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-foreground">Withdrawal Request</p>
                            <p className="font-bold text-primary">Rs {withdrawal.amount}</p>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {format(new Date(withdrawal.created_at), 'MMM d, yyyy')}
                            </span>
                            <Badge className={`${status.color} border-0 text-xs`}>
                              {status.label}
                            </Badge>
                          </div>
                          {withdrawal.admin_notes && (
                            <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">
                              {withdrawal.admin_notes}
                            </p>
                          )}
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

export default WithdrawalRequestPanel;
