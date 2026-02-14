import { useState } from 'react';
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
  CreditCard,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  useAllWithdrawals,
  useProcessWithdrawal,
  WithdrawalRequest
} from '@/hooks/useWithdrawals';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-500', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-500/20 text-blue-500', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-500', icon: XCircle },
  paid: { label: 'Paid', color: 'bg-green-500/20 text-green-500', icon: CreditCard },
};

const WithdrawalsManager = () => {
  const { data: withdrawals, isLoading } = useAllWithdrawals();
  const processWithdrawal = useProcessWithdrawal();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');

  const filteredWithdrawals = withdrawals?.filter((w) => {
    const matchesSearch = w.rider?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.rider?.phone?.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = withdrawals?.filter(w => w.status === 'pending').length || 0;
  const totalPending = withdrawals?.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0) || 0;
  const totalPaid = withdrawals?.filter(w => w.status === 'paid').reduce((sum, w) => sum + w.amount, 0) || 0;

  const handleProcess = (status: 'approved' | 'rejected' | 'paid') => {
    if (!selectedWithdrawal) return;
    processWithdrawal.mutate({
      withdrawalId: selectedWithdrawal.id,
      status,
      adminNotes,
      paymentMethod,
      paymentReference,
    }, {
      onSuccess: () => {
        setSelectedWithdrawal(null);
        setAdminNotes('');
        setPaymentReference('');
      }
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
                <p className="text-sm text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-2xl font-bold text-orange-500">Rs {totalPending}</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-full">
                <AlertCircle className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-green-500">Rs {totalPaid}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-full">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawals List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Withdrawal Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by rider name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredWithdrawals?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No withdrawal requests found</p>
              </div>
            ) : (
              filteredWithdrawals?.map((withdrawal, index) => {
                const status = statusConfig[withdrawal.status] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={withdrawal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-muted/30 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={withdrawal.rider?.image || ''} />
                          <AvatarFallback>
                            <User className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {withdrawal.rider?.name || 'Unknown Rider'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {withdrawal.rider?.phone}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">Rs {withdrawal.amount}</p>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                    </div>

                    {withdrawal.admin_notes && (
                      <div className="mt-3 p-2 bg-muted rounded text-sm text-muted-foreground">
                        <strong>Admin Notes:</strong> {withdrawal.admin_notes}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(withdrawal.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      {withdrawal.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                            onClick={() => {
                              setSelectedWithdrawal(withdrawal);
                              setAdminNotes('');
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                            onClick={() => {
                              setSelectedWithdrawal(withdrawal);
                              handleProcess('rejected');
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {withdrawal.status === 'approved' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                          }}
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Process Dialog */}
      <Dialog open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Rider</p>
              <p className="font-medium">{selectedWithdrawal?.rider?.name}</p>
              <p className="text-2xl font-bold text-primary mt-2">Rs {selectedWithdrawal?.amount}</p>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="easypaisa">Easypaisa</SelectItem>
                  <SelectItem value="jazzcash">JazzCash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Reference (optional)</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Transaction ID or reference"
              />
            </div>

            <div className="space-y-2">
              <Label>Admin Notes (optional)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              {selectedWithdrawal?.status === 'pending' && (
                <Button
                  onClick={() => handleProcess('approved')}
                  className="flex-1"
                  disabled={processWithdrawal.isPending}
                >
                  {processWithdrawal.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Approve
                </Button>
              )}
              {(selectedWithdrawal?.status === 'pending' || selectedWithdrawal?.status === 'approved') && (
                <Button
                  onClick={() => handleProcess('paid')}
                  variant="default"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={processWithdrawal.isPending}
                >
                  {processWithdrawal.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Mark as Paid
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WithdrawalsManager;
