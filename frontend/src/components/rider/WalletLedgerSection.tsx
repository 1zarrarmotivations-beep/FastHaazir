import { motion } from 'framer-motion';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Gift, 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useRiderWalletAdjustments, WalletAdjustment } from '@/hooks/useWalletAdjustments';

interface WalletLedgerSectionProps {
  riderId: string;
}

const typeConfig: Record<string, { label: string; labelUr: string; color: string; icon: any }> = {
  cash_advance: { label: 'Cash Advance', labelUr: 'نقد ایڈوانس', color: 'text-blue-500', icon: ArrowUpCircle },
  bonus: { label: 'Bonus', labelUr: 'بونس', color: 'text-green-500', icon: Gift },
  deduction: { label: 'Deduction', labelUr: 'کٹوتی', color: 'text-red-500', icon: ArrowDownCircle },
  settlement: { label: 'Settlement', labelUr: 'تصفیہ', color: 'text-orange-500', icon: CheckCircle },
  correction: { label: 'Correction', labelUr: 'اصلاح', color: 'text-purple-500', icon: AlertTriangle },
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  active: { label: 'Active', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock },
  settled: { label: 'Settled', color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle },
};

const WalletLedgerSection = ({ riderId }: WalletLedgerSectionProps) => {
  const { data: adjustments = [], isLoading } = useRiderWalletAdjustments(riderId);

  // Filter to only show active and settled (not cancelled)
  const visibleAdjustments = adjustments.filter(a => a.status !== 'cancelled');

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (visibleAdjustments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-foreground flex items-center gap-2">
        <ArrowUpCircle className="w-4 h-4 text-blue-500" />
        Admin Credits & Adjustments
      </h4>
      
      {visibleAdjustments.map((adjustment, index) => {
        const type = typeConfig[adjustment.adjustment_type] || typeConfig.cash_advance;
        const status = statusConfig[adjustment.status];
        const TypeIcon = type.icon;
        const isCredit = adjustment.adjustment_type === 'cash_advance' || 
                         adjustment.adjustment_type === 'bonus' || 
                         adjustment.adjustment_type === 'correction';

        return (
          <motion.div
            key={adjustment.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center`}>
                  <TypeIcon className={`w-5 h-5 ${type.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-foreground">{type.label}</p>
                    <p className={`font-bold ${isCredit ? 'text-blue-500' : 'text-red-500'}`}>
                      {isCredit ? '+' : '-'}Rs {adjustment.amount}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {adjustment.reason}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(adjustment.created_at), 'MMM d, yyyy')}
                    </p>
                    <Badge className={`${status.bg} ${status.color} border-0 text-xs`}>
                      {status.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

export default WalletLedgerSection;
