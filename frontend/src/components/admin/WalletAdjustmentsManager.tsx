import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Wallet,
  Search,
  Loader2,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  useAllWalletAdjustments,
  useCreateWalletAdjustment,
  useSettleWalletAdjustment,
  useCancelWalletAdjustment,
  WalletAdjustment
} from '@/hooks/useWalletAdjustments';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
  cash_advance: { label: 'Cash Advance', color: 'bg-blue-500/20 text-blue-500', icon: ArrowUpCircle },
  bonus: { label: 'Bonus', color: 'bg-green-500/20 text-green-500', icon: Plus },
  deduction: { label: 'Deduction', color: 'bg-red-500/20 text-red-500', icon: ArrowDownCircle },
  settlement: { label: 'Settlement', color: 'bg-orange-500/20 text-orange-500', icon: CheckCircle },
  correction: { label: 'Correction', color: 'bg-purple-500/20 text-purple-500', icon: AlertTriangle },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: 'Active', color: 'bg-yellow-500/20 text-yellow-500', icon: Clock },
  settled: { label: 'Settled', color: 'bg-green-500/20 text-green-500', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-500', icon: XCircle },
};

interface RiderOption {
  id: string;
  name: string;
  phone: string;
  image: string | null;
}

interface WalletAdjustmentsManagerProps {
  riderId?: string;
}

const WalletAdjustmentsManager = ({ riderId }: WalletAdjustmentsManagerProps) => {
  const { data: adjustments, isLoading } = useAllWalletAdjustments();
  const createAdjustment = useCreateWalletAdjustment();
  const settleAdjustment = useSettleWalletAdjustment();
  const cancelAdjustment = useCancelWalletAdjustment();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<WalletAdjustment | null>(null);
  const [settleNotes, setSettleNotes] = useState('');

  // Form state for new adjustment
  const [newRiderId, setNewRiderId] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<WalletAdjustment['adjustment_type']>('cash_advance');
  const [newReason, setNewReason] = useState('');

  // Handle incoming riderId
  useEffect(() => {
    if (riderId) {
      setNewRiderId(riderId);
      // Optional: search for the rider to show their adjustments
      const rider = riders?.find(r => r.id === riderId);
      if (rider) {
        setSearchQuery(rider.name);
      }
    }
  }, [riderId, riders]);

  // Fetch riders for dropdown
  const { data: riders } = useQuery({
    queryKey: ['all-riders-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('riders')
        .select('id, name, phone, image')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as RiderOption[];
    },
  });

  const filteredAdjustments = adjustments?.filter((a) => {
    const matchesSearch = a.rider?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.rider?.phone?.includes(searchQuery) ||
      a.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesType = typeFilter === 'all' || a.adjustment_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const activeAdvances = adjustments?.filter(a => a.status === 'active' && a.adjustment_type === 'cash_advance') || [];
  const totalActiveAdvances = activeAdvances.reduce((sum, a) => sum + a.amount, 0);
  const settledCount = adjustments?.filter(a => a.status === 'settled').length || 0;

  const handleCreate = () => {
    const amount = Number(newAmount);
    if (!newRiderId || amount <= 0 || !newReason.trim()) return;

    createAdjustment.mutate({
      riderId: newRiderId,
      amount,
      adjustmentType: newType,
      reason: newReason.trim(),
    }, {
      onSuccess: () => {
        setShowAddDialog(false);
        setNewRiderId('');
        setNewAmount('');
        setNewType('cash_advance');
        setNewReason('');
      }
    });
  };

  const handleSettle = () => {
    if (!selectedAdjustment) return;
    settleAdjustment.mutate({
      adjustmentId: selectedAdjustment.id,
      settledNotes: settleNotes,
    }, {
      onSuccess: () => {
        setSelectedAdjustment(null);
        setSettleNotes('');
      }
    });
  };

  const handleCancel = (adjustment: WalletAdjustment) => {
    cancelAdjustment.mutate({
      adjustmentId: adjustment.id,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Advances</p>
                <p className="text-2xl font-bold text-blue-500">{activeAdvances.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-full">
                <ArrowUpCircle className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold text-orange-500">Rs {totalActiveAdvances}</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-full">
                <DollarSign className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Settled</p>
                <p className="text-2xl font-bold text-green-500">{settledCount}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Button */}
      <Button onClick={() => setShowAddDialog(true)} className="gap-2">
        <Plus className="w-4 h-4" />
        Add Cash Advance
      </Button>

      {/* Adjustments List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Wallet Adjustments Ledger
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by rider or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="cash_advance">Cash Advance</SelectItem>
                <SelectItem value="bonus">Bonus</SelectItem>
                <SelectItem value="deduction">Deduction</SelectItem>
                <SelectItem value="settlement">Settlement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredAdjustments?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No wallet adjustments found</p>
              </div>
            ) : (
              filteredAdjustments?.map((adjustment, index) => {
                const type = typeConfig[adjustment.adjustment_type] || typeConfig.cash_advance;
                const status = statusConfig[adjustment.status];
                const TypeIcon = type.icon;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={adjustment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-muted/30 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={adjustment.rider?.image || ''} />
                          <AvatarFallback>
                            <User className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {adjustment.rider?.name || 'Unknown Rider'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {adjustment.rider?.phone}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${adjustment.adjustment_type === 'deduction' || adjustment.adjustment_type === 'settlement'
                          ? 'text-red-500'
                          : 'text-green-500'
                          }`}>
                          {adjustment.adjustment_type === 'deduction' || adjustment.adjustment_type === 'settlement' ? '-' : '+'}
                          Rs {adjustment.amount}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <Badge className={type.color}>
                            <TypeIcon className="w-3 h-3 mr-1" />
                            {type.label}
                          </Badge>
                          <Badge className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 p-2 bg-muted rounded text-sm">
                      <strong>Reason:</strong> {adjustment.reason}
                    </div>

                    {adjustment.settled_notes && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm text-muted-foreground">
                        <strong>Settlement Notes:</strong> {adjustment.settled_notes}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(adjustment.created_at), 'MMM d, yyyy h:mm a')}
                        {adjustment.settled_at && (
                          <> • Settled: {format(new Date(adjustment.settled_at), 'MMM d, yyyy')}</>
                        )}
                      </span>
                      {adjustment.status === 'active' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                            onClick={() => setSelectedAdjustment(adjustment)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Settle
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                            onClick={() => handleCancel(adjustment)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Adjustment Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-blue-500" />
              Add Cash Advance / Credit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Rider *</Label>
              <Select value={newRiderId} onValueChange={setNewRiderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a rider" />
                </SelectTrigger>
                <SelectContent>
                  {riders?.map((rider) => (
                    <SelectItem key={rider.id} value={rider.id}>
                      {rider.name} ({rider.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as WalletAdjustment['adjustment_type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_advance">Cash Advance</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                  <SelectItem value="deduction">Deduction</SelectItem>
                  <SelectItem value="correction">Correction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount (Rs) *</Label>
              <Input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label>Reason / Note *</Label>
              <Textarea
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="e.g., Advance for shop purchase, Fuel bonus..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleCreate}
              className="w-full"
              disabled={createAdjustment.isPending || !newRiderId || !newAmount || !newReason.trim()}
            >
              {createAdjustment.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Add {newType === 'cash_advance' ? 'Cash Advance' : newType === 'bonus' ? 'Bonus' : 'Adjustment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settle Dialog */}
      <Dialog open={!!selectedAdjustment} onOpenChange={() => setSelectedAdjustment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle Adjustment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Rider</p>
              <p className="font-medium">{selectedAdjustment?.rider?.name}</p>
              <p className="text-2xl font-bold text-primary mt-2">Rs {selectedAdjustment?.amount}</p>
              <p className="text-sm text-muted-foreground mt-1">{selectedAdjustment?.reason}</p>
            </div>

            <div className="space-y-2">
              <Label>Settlement Notes (optional)</Label>
              <Textarea
                value={settleNotes}
                onChange={(e) => setSettleNotes(e.target.value)}
                placeholder="Add settlement notes..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleSettle}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={settleAdjustment.isPending}
            >
              {settleAdjustment.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Mark as Settled
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletAdjustmentsManager;
