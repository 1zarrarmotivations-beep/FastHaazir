import React from 'react';
import { useAdminStats, useRecentOrders } from '@/hooks/useAdmin';
import { motion } from 'framer-motion';
import {
    Banknote,
    TrendingUp,
    CreditCard,
    Plus,
    Send,
    MoreVertical,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    Calendar,
    DollarSign,
    ShoppingBag,
    Bike
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

// Mock data for the chart - In a real app, this would come from an analytics API
const chartData = [
    { name: 'Jan', income: 4000, expense: 2400 },
    { name: 'Feb', income: 3000, expense: 1398 },
    { name: 'Mar', income: 2000, expense: 9800 },
    { name: 'Apr', income: 2780, expense: 3908 },
    { name: 'May', income: 1890, expense: 4800 },
    { name: 'Jun', income: 2390, expense: 3800 },
    { name: 'Jul', income: 3490, expense: 4300 },
];

interface ModernAdminDashboardProps {
    onNavigate: (tab: string, riderId?: string) => void;
}

export default function ModernAdminDashboard({ onNavigate }: ModernAdminDashboardProps) {
    const { data: stats, isLoading: statsLoading } = useAdminStats();
    const { data: recentOrders, isLoading: ordersLoading } = useRecentOrders();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            {/* Top Header Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Dashboard
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Overview of your business performance</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="border-white/10 text-white hover:bg-white/5 gap-2"
                        onClick={() => onNavigate('wallet-adjustments')}
                    >
                        <Wallet className="w-4 h-4" />
                        Manage Balance
                    </Button>
                    <Button
                        className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg shadow-orange-500/20"
                        onClick={() => onNavigate('withdrawals')}
                    >
                        <DollarSign className="w-4 h-4" />
                        Process Payouts
                    </Button>
                </div>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Revenue */}
                <motion.div variants={itemVariants} className="glass-card-dark rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <DollarSign className="w-32 h-32 text-orange-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <Banknote className="w-6 h-6 text-orange-500" />
                            </div>
                            <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-400/20">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                +12.5%
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-400 text-sm font-medium tracking-wide uppercase">Total Revenue</p>
                            <h3 className="text-4xl font-extrabold text-white tracking-tight">
                                ₨{(stats?.totalRevenue || 0).toLocaleString()}
                            </h3>
                        </div>
                    </div>
                </motion.div>

                {/* Total Orders */}
                <motion.div variants={itemVariants} className="glass-card-dark rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ShoppingBag className="w-32 h-32 text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <ShoppingBag className="w-6 h-6 text-blue-500" />
                            </div>
                            <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-400/20">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                +8.2%
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-400 text-sm font-medium tracking-wide uppercase">Total Orders</p>
                            <h3 className="text-4xl font-extrabold text-white tracking-tight">
                                {(stats?.totalOrders || 0).toLocaleString()}
                            </h3>
                        </div>
                    </div>
                </motion.div>

                {/* Active Riders */}
                <motion.div variants={itemVariants} className="glass-card-dark rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Bike className="w-32 h-32 text-purple-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <Bike className="w-6 h-6 text-purple-500" />
                            </div>
                            <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-400/20">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                +5.0%
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-400 text-sm font-medium tracking-wide uppercase">Active Riders</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-4xl font-extrabold text-white tracking-tight">
                                    {(stats?.activeRiders || 0).toLocaleString()}
                                </h3>
                                <span className="text-sm font-medium text-gray-500 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                    {stats?.onlineRiders || 0} Online
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Main Content Area: Chart + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cash Flow Chart */}
                <motion.div variants={itemVariants} className="lg:col-span-2 glass-card-dark rounded-3xl p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-white">Cash Flow</h3>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                    <span className="text-sm text-gray-400">Income</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                    <span className="text-sm text-gray-400">Expenses</span>
                                </div>
                            </div>
                        </div>
                        <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm text-white focus:outline-none">
                            <option>Monthly</option>
                            <option>Weekly</option>
                        </select>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" tick={{ fill: '#666' }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#666" tick={{ fill: '#666' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f1f1f', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expense" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Quick Actions / Card Panel */}
                <motion.div variants={itemVariants} className="space-y-6">
                    {/* Card Visual */}
                    <div className="bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] p-6 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
                        <div className="flex justify-between items-start mb-8">
                            <CreditCard className="w-8 h-8 text-white/80" />
                            <Banknote className="w-8 h-8 text-white/80" />
                        </div>
                        <div className="mb-4">
                            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Total Admin Balance</p>
                            <h3 className="text-3xl font-bold text-white tracking-tight">₨{(stats?.adminBalance || 0).toLocaleString()}</h3>
                            {stats?.pendingWithdrawals > 0 && (
                                <p className="text-xs text-orange-400 mt-1 font-medium animate-pulse">
                                    ₨{stats.pendingWithdrawals.toLocaleString()} pending payout
                                </p>
                            )}
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Account Holder</p>
                                <p className="text-white font-medium text-sm">Fast Haazir Admin</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Expires</p>
                                <p className="text-white font-medium text-sm">12/30</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions Grid */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Quick Actions</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="h-12 border-white/5 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/50 hover:text-orange-500 transition-all duration-300 border justify-start px-4 rounded-xl group"
                                onClick={() => onNavigate('analytics')}
                            >
                                <TrendingUp className="w-4 h-4 mr-3 text-gray-400 group-hover:text-orange-500 transition-colors" />
                                <span className="font-medium">Details</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-12 border-white/5 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/50 hover:text-orange-500 transition-all duration-300 border justify-start px-4 rounded-xl group"
                                onClick={() => onNavigate('riders')}
                            >
                                <Send className="w-4 h-4 mr-3 text-gray-400 group-hover:text-orange-500 transition-colors" />
                                <span className="font-medium">Riders</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-12 border-white/5 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/50 hover:text-orange-500 transition-all duration-300 border justify-start px-4 rounded-xl group"
                                onClick={() => onNavigate('earnings')}
                            >
                                <Wallet className="w-4 h-4 mr-3 text-gray-400 group-hover:text-orange-500 transition-colors" />
                                <span className="font-medium">Earnings</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-12 border-white/5 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/50 hover:text-orange-500 transition-all duration-300 border justify-start px-4 rounded-xl group"
                                onClick={() => onNavigate('payment-settings')}
                            >
                                <MoreVertical className="w-4 h-4 mr-3 text-gray-400 group-hover:text-orange-500 transition-colors" />
                                <span className="font-medium">Settings</span>
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Recent Transactions Table */}
            <motion.div variants={itemVariants} className="glass-card-dark rounded-3xl p-6 border border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Recent Transactions</h3>
                    <Button variant="ghost" className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10">View All</Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10 text-left">
                                <th className="py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">Order ID</th>
                                <th className="py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                                <th className="py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {ordersLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">Loading transactions...</td>
                                </tr>
                            ) : recentOrders?.map((order: any) => (
                                <tr key={order.id} className="group hover:bg-white/5 transition-colors">
                                    <td className="py-4 px-4">
                                        <span className="font-mono text-xs text-gray-400 group-hover:text-white transition-colors">
                                            #{order.id.slice(0, 8)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold text-xs">
                                                {(order.business?.name || 'Unknown')[0]}
                                            </div>
                                            <span className="text-sm font-medium text-white">{order.business?.name || 'Direct Order'}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="text-sm font-bold text-white">₨{order.total_amount}</span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="text-sm text-gray-400">
                                            {format(new Date(order.created_at), 'MMM dd - HH:mm')}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500' :
                                                order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                                                    'bg-blue-500/10 text-blue-500'}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
}
