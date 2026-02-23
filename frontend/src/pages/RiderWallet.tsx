import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRiderProfile } from '@/hooks/useRiderDashboard';
import {
    Wallet,
    ArrowUpCircle,
    ArrowDownCircle,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronLeft,
    TrendingUp,
    History as HistoryIcon,
    DollarSign,
    PlusCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface WalletSummary {
    total_earned: number;
    total_adjustments: number;
    total_withdrawn: number;
    current_balance: number;
}

const RiderWallet = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: riderProfile } = useRiderProfile();
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

    // Fetch Wallet Summary
    const { data: summary, isLoading: isSummaryLoading } = useQuery<WalletSummary>({
        queryKey: ['rider-wallet-summary'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_rider_wallet_summary');
            if (error) throw error;
            return data as unknown as WalletSummary;
        },
        enabled: !!riderProfile
    });

    // Fetch Transactions (Combined)
    const { data: transactions, isLoading: isTransactionsLoading } = useQuery({
        queryKey: ['rider-transactions'],
        queryFn: async () => {
            if (!riderProfile) return [];

            // Fetch Payments
            const { data: payments } = await supabase
                .from('rider_payments')
                .select('*')
                .eq('rider_id', riderProfile.id)
                .order('created_at', { ascending: false })
                .limit(20);

            // Fetch Adjustments
            const { data: adjustments } = await supabase
                .from('rider_wallet_adjustments')
                .select('*')
                .eq('rider_id', riderProfile.id)
                .order('created_at', { ascending: false })
                .limit(20);

            // Fetch Withdrawals
            const { data: withdrawals } = await supabase
                .from('withdrawal_requests')
                .select('*')
                .eq('rider_id', riderProfile.id)
                .order('created_at', { ascending: false })
                .limit(20);

            // Combine and format
            const combined = [
                ...(payments || []).map(p => ({
                    id: p.id,
                    type: 'payment',
                    amount: p.final_amount,
                    status: p.status,
                    date: p.created_at,
                    title: `Delivery Payment #${p.id.slice(0, 4)}`,
                    icon: <ArrowUpCircle className="text-green-500" />
                })),
                ...(adjustments || []).map(a => ({
                    id: a.id,
                    type: 'adjustment',
                    amount: a.amount,
                    status: a.status,
                    date: a.created_at,
                    title: a.reason || 'Wallet Adjustment',
                    icon: a.amount > 0 ? <PlusCircle className="text-blue-500" /> : <ArrowDownCircle className="text-red-500" />
                })),
                ...(withdrawals || []).map(w => ({
                    id: w.id,
                    type: 'withdrawal',
                    amount: -w.amount,
                    status: w.status,
                    date: w.created_at,
                    title: 'Withdrawal Request',
                    icon: <Wallet className="text-orange-500" />
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30);

            return combined;
        },
        enabled: !!riderProfile
    });

    // Withdrawal Mutation
    const withdrawMutation = useMutation({
        mutationFn: async (amount: number) => {
            if (!riderProfile) throw new Error('No rider profile');
            if (amount <= 0) throw new Error('Invalid amount');
            if (amount > (summary?.current_balance || 0)) throw new Error('Insufficient balance');

            const { data, error } = await supabase
                .from('withdrawal_requests')
                .insert({
                    rider_id: riderProfile.id,
                    amount: amount,
                    status: 'pending'
                });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success("Withdrawal request submitted! Pending approval.");
            setWithdrawAmount('');
            setIsWithdrawModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['rider-wallet-summary'] });
            queryClient.invalidateQueries({ queryKey: ['rider-transactions'] });
        },
        onError: (error: any) => {
            toast.error(error.message);
        }
    });

    const handleWithdraw = () => {
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount)) {
            toast.error("Enter a valid amount");
            return;
        }
        withdrawMutation.mutate(amount);
    };

    const getStatusBadge = (status: string, type: string) => {
        if (status === 'completed' || status === 'paid' || status === 'approved' || status === 'verified') {
            return <Badge className="bg-green-500/10 text-green-500 border-none capitalize">{status}</Badge>;
        }
        if (status === 'pending') {
            return <Badge className="bg-yellow-500/10 text-yellow-500 border-none capitalize">{status}</Badge>;
        }
        return <Badge className="bg-red-500/10 text-red-500 border-none capitalize">{status}</Badge>;
    };

    return (
        <div className="min-h-screen bg-black text-white">
            <main className="container max-w-lg mx-auto px-4 pt-10 pb-32">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-black text-white">Wallet</h1>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full bg-white/5"
                        onClick={() => navigate('/rider')}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                </div>

                {/* Main Balance Card - Premium Tactical HUD Style */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-[32px] p-8 mb-6 border border-white/5"
                    style={{
                        background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.8) 0%, rgba(0, 0, 0, 1) 100%)',
                        backdropFilter: 'blur(20px)'
                    }}
                >
                    {/* Background Decorative HUD elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-[60px] pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/5 rounded-full blur-[40px] pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Available Balance</span>
                        <div className="text-5xl font-black mb-8 tracking-tighter text-white">
                            ₨{isSummaryLoading ? '...' : (summary?.current_balance || 0).toLocaleString()}
                        </div>

                        <div className="flex gap-3 w-full max-w-xs">
                            <Button
                                className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-2xl h-12 font-bold shadow-lg shadow-primary/20"
                                onClick={() => setIsWithdrawModalOpen(true)}
                                disabled={!summary?.current_balance || summary.current_balance <= 0}
                            >
                                <ArrowDownCircle className="mr-2 w-5 h-5" />
                                Withdraw
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-2xl h-12 font-bold"
                            >
                                <TrendingUp className="mr-2 w-5 h-5 text-green-500" />
                                Stats
                            </Button>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden shadow-none">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                <DollarSign className="w-3 h-3" />
                                Total Earned
                            </div>
                            <div className="text-xl font-bold text-green-500">
                                Rs. {(summary?.total_earned || 0).toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden shadow-none">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                <HistoryIcon className="w-3 h-3" />
                                Withdrawn
                            </div>
                            <div className="text-xl font-bold text-primary">
                                Rs. {(summary?.total_withdrawn || 0).toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Transaction List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <HistoryIcon className="w-5 h-5 text-primary" />
                            Recent activity
                        </h2>
                        <Button variant="link" className="text-primary text-sm p-0">View All</Button>
                    </div>

                    <div className="space-y-3">
                        {isTransactionsLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                            ))
                        ) : transactions?.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>No transactions yet</p>
                            </div>
                        ) : (
                            transactions?.map((tx: any) => (
                                <motion.div
                                    key={`${tx.type}-${tx.id}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                            {tx.icon}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm leading-none mb-1">{tx.title}</p>
                                            <p className="text-[10px] text-slate-500">{format(new Date(tx.date), 'MMM dd, hh:mm a')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-slate-300'}`}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                        </p>
                                        <div className="mt-1">{getStatusBadge(tx.status, tx.type)}</div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* Withdraw Modal */}
            <AnimatePresence>
                {isWithdrawModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                        onClick={() => setIsWithdrawModalOpen(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="w-full max-w-md bg-[#1e293b] rounded-t-3xl sm:rounded-3xl p-8 border-t sm:border border-white/10"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 sm:hidden" />
                            <h2 className="text-2xl font-bold mb-2">Request Payout</h2>
                            <p className="text-slate-400 text-sm mb-6">Enter the amount you'd like to withdraw to your linked bank/wallet account.</p>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Amount (PKR)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-500">Rs.</span>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            className="h-14 bg-white/5 border-white/10 rounded-2xl pl-12 text-xl font-black focus:ring-primary"
                                            value={withdrawAmount}
                                            onChange={e => setWithdrawAmount(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[11px] px-1">
                                        <span className="text-slate-500">Available: Rs. {summary?.current_balance?.toLocaleString() || '0'}</span>
                                        <button
                                            className="text-primary font-bold"
                                            onClick={() => setWithdrawAmount(summary?.current_balance?.toString() || '0')}
                                        >
                                            Use Max
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/20"
                                    onClick={handleWithdraw}
                                    disabled={withdrawMutation.isPending || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                                >
                                    {withdrawMutation.isPending ? (
                                        <span className="flex items-center gap-2 justify-center">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Processing...
                                        </span>
                                    ) : "Confirm Withdrawal"}
                                </Button>

                                <Button
                                    variant="ghost"
                                    className="w-full text-slate-500 hover:text-white"
                                    onClick={() => setIsWithdrawModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RiderWallet;
