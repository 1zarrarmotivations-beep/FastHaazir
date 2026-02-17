import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  DollarSign,
  MapPin,
  Search,
  Loader2,
  Edit,
  User,
  TrendingUp,
  TrendingDown,
  Route
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  useAllRiderPayments,
  useUpdatePaymentBonus,
  useUpdatePaymentStatus,
  RiderPayment
} from '@/hooks/useRiderPayments';
import PaymentSettingsManager from './PaymentSettingsManager';
import { safeLower } from '@/lib/utils';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  completed: 'bg-blue-500/20 text-blue-500',
  paid: 'bg-green-500/20 text-green-500',
};

const RiderPaymentsManager = () => {
  const { data: payments, isLoading } = useAllRiderPayments();
  const updateBonus = useUpdatePaymentBonus();
  const updateStatus = useUpdatePaymentStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<RiderPayment | null>(null);
  const [bonus, setBonus] = useState(0);
  const [penalty, setPenalty] = useState(0);

  const filteredPayments = payments?.filter((payment) => {
    const matchesSearch = safeLower(payment.rider?.name).includes(safeLower(searchQuery)) ||
      safeLower(payment.rider?.phone).includes(safeLower(searchQuery));
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalEarnings = payments?.reduce((sum, p) => sum + (p.final_amount || 0), 0) || 0;
  const paidAmount = payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.final_amount || 0), 0) || 0;
  const pendingAmount = payments?.filter(p => p.status !== 'paid').reduce((sum, p) => sum + (p.final_amount || 0), 0) || 0;

  const handleUpdateBonus = () => {
    if (!selectedPayment) return;
    updateBonus.mutate({
      paymentId: selectedPayment.id,
      bonus,
      penalty,
    });
    setSelectedPayment(null);
  };

  const handleStatusChange = (paymentId: string, status: 'pending' | 'completed' | 'paid') => {
    updateStatus.mutate({ paymentId, status });
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
      {/* Payment Settings */}
      <PaymentSettingsManager />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-foreground">Rs {totalEarnings}</p>
              </div>
              <div className="p-3 bg-primary/20 rounded-full">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-green-500">Rs {paidAmount}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-500">Rs {pendingAmount}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <TrendingDown className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Rider Payments
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
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredPayments?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payments found
              </div>
            ) : (
              filteredPayments?.map((payment, index) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-muted/30 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={payment.rider?.image || ''} />
                        <AvatarFallback>
                          <User className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {payment.rider?.name || 'Unknown Rider'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payment.rider?.phone}
                        </p>
                      </div>
                    </div>
                    <Badge className={statusColors[payment.status]}>
                      {payment.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <Route className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{payment.distance_km} km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Base: Rs {payment.base_fee}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">@Rs {payment.per_km_rate}/km</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-primary">
                        Rs {payment.final_amount}
                      </span>
                      {(payment.bonus > 0 || payment.penalty > 0) && (
                        <span className="text-xs text-muted-foreground block">
                          {payment.bonus > 0 && `+${payment.bonus} bonus`}
                          {payment.penalty > 0 && ` -${payment.penalty} penalty`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(payment.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setBonus(payment.bonus || 0);
                              setPenalty(payment.penalty || 0);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Adjust
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adjust Payment</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Bonus (PKR)</Label>
                              <Input
                                type="number"
                                value={bonus}
                                onChange={(e) => setBonus(Number(e.target.value))}
                                min={0}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Penalty (PKR)</Label>
                              <Input
                                type="number"
                                value={penalty}
                                onChange={(e) => setPenalty(Number(e.target.value))}
                                min={0}
                              />
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3">
                              <p className="text-sm text-muted-foreground">
                                Calculated: Rs {selectedPayment?.calculated_amount}
                              </p>
                              <p className="text-lg font-bold text-foreground">
                                Final: Rs {(selectedPayment?.calculated_amount || 0) + bonus - penalty}
                              </p>
                            </div>
                            <Button
                              onClick={handleUpdateBonus}
                              className="w-full"
                              disabled={updateBonus.isPending}
                            >
                              {updateBonus.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                              Save Changes
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Select
                        value={payment.status}
                        onValueChange={(value) => handleStatusChange(payment.id, value as any)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiderPaymentsManager;
