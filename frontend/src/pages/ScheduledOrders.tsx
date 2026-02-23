import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, Filter, RefreshCw, ChevronRight, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { fetchScheduledOrders, ScheduledOrder } from '@/hooks/useScheduling';
import ScheduledOrderCard from '@/components/scheduling/ScheduledOrderCard';
import OrderDetailsModal from '@/components/scheduling/OrderDetailsModal';
import CancelConfirmationModal from '@/components/scheduling/CancelConfirmationModal';
import RescheduleModal from '@/components/scheduling/RescheduleModal';

type FilterStatus = 'all' | 'pending' | 'assigned' | 'completed' | 'cancelled';

const ScheduledOrdersPage: React.FC = () => {
    const { t } = useTranslation();
    const { user, loading: authLoading } = useAuth();
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<ScheduledOrder | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);

    // Fetch scheduled orders
    const { data: scheduledOrders, isLoading, refetch } = useQuery({
        queryKey: ['scheduled-orders', user?.id],
        queryFn: () => fetchScheduledOrders(user!.id),
        enabled: !!user,
    });

    // Filter orders based on active tab
    const filteredOrders = scheduledOrders?.filter(order => {
        if (activeFilter === 'all') return true;
        return order.status === activeFilter;
    }) || [];

    // Handle pull-to-refresh
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    // Handle viewing order details
    const handleViewDetails = (order: ScheduledOrder) => {
        setSelectedOrder(order);
        setShowDetailsModal(true);
    };

    // Handle cancel request
    const handleCancelRequest = (order: ScheduledOrder) => {
        setSelectedOrder(order);
        setShowCancelModal(true);
    };

    // Handle reschedule request
    const handleRescheduleRequest = (order: ScheduledOrder) => {
        setSelectedOrder(order);
        setShowRescheduleModal(true);
    };

    // Get counts for filter tabs
    const getCounts = () => {
        if (!scheduledOrders) return { all: 0, pending: 0, assigned: 0, completed: 0, cancelled: 0 };
        return {
            all: scheduledOrders.length,
            pending: scheduledOrders.filter(o => o.status === 'pending').length,
            assigned: scheduledOrders.filter(o => o.status === 'assigned').length,
            completed: scheduledOrders.filter(o => o.status === 'completed').length,
            cancelled: scheduledOrders.filter(o => o.status === 'cancelled').length,
        };
    };

    const counts = getCounts();

    if (authLoading) {
        return (
            <div className="mobile-container bg-background min-h-screen pb-24">
                <header className="sticky top-0 z-50 glass border-b border-border/50">
                    <div className="px-4 py-4">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-32 mt-1" />
                    </div>
                </header>
                <div className="p-4 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-40 w-full rounded-2xl" />
                    ))}
                </div>
                <BottomNav />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="mobile-container bg-background min-h-screen pb-24">
                <header className="sticky top-0 z-50 glass border-b border-border/50">
                    <div className="px-4 py-4">
                        <h1 className="text-xl font-bold text-foreground">{t('scheduledOrders.title')}</h1>
                        <p className="text-sm text-muted-foreground">{t('scheduledOrders.subtitle')}</p>
                    </div>
                </header>

                <div className="flex flex-col items-center justify-center h-[50vh] px-4">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4"
                    >
                        <Calendar className="w-10 h-10 text-muted-foreground" />
                    </motion.div>
                    <h2 className="font-bold text-lg mb-2">{t('auth.loginToViewOrders')}</h2>
                    <p className="text-muted-foreground text-sm text-center mb-6">
                        {t('scheduledOrders.loginMessage')}
                    </p>
                    <Button onClick={() => window.location.href = '/auth'}>
                        {t('auth.login')}
                    </Button>
                </div>

                <BottomNav />
            </div>
        );
    }

    return (
        <div className="mobile-container bg-background min-h-screen pb-24">
            {/* Header */}
            <header className="sticky top-0 z-50 glass border-b border-border/50">
                <div className="px-4 py-4">
                    <h1 className="text-xl font-bold text-foreground">{t('scheduledOrders.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('scheduledOrders.subtitle')}</p>
                </div>
            </header>

            {/* Filter Tabs */}
            <div className="px-4 py-3 border-b border-border/50">
                <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterStatus)}>
                    <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
                        <TabsTrigger value="all" className="flex items-center gap-2">
                            <Filter className="w-3 h-3" />
                            {t('scheduledOrders.filters.all')}
                            <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{counts.all}</span>
                        </TabsTrigger>
                        <TabsTrigger value="pending" className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {t('scheduledOrders.filters.pending')}
                            <span className="ml-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-1.5 py-0.5 rounded-full">{counts.pending}</span>
                        </TabsTrigger>
                        <TabsTrigger value="assigned" className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            {t('scheduledOrders.filters.assigned')}
                            <span className="ml-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-1.5 py-0.5 rounded-full">{counts.assigned}</span>
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="flex items-center gap-2">
                            <ChevronRight className="w-3 h-3" />
                            {t('scheduledOrders.filters.completed')}
                            <span className="ml-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-1.5 py-0.5 rounded-full">{counts.completed}</span>
                        </TabsTrigger>
                        <TabsTrigger value="cancelled" className="flex items-center gap-2">
                            {t('scheduledOrders.filters.cancelled')}
                            <span className="ml-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-1.5 py-0.5 rounded-full">{counts.cancelled}</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Pull to refresh hint */}
            <div className="px-4 py-2 text-center">
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="text-xs text-muted-foreground flex items-center justify-center gap-1 mx-auto"
                >
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? t('scheduledOrders.refreshing') : t('scheduledOrders.pullToRefresh')}
                </button>
            </div>

            {/* Orders List */}
            <div className="p-4 space-y-4">
                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-40 w-full rounded-2xl" />
                    ))
                ) : !filteredOrders || filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[40vh]">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4"
                        >
                            <Calendar className="w-10 h-10 text-muted-foreground" />
                        </motion.div>
                        <h2 className="font-bold text-lg mb-2">
                            {activeFilter === 'all'
                                ? t('scheduledOrders.empty.title')
                                : t(`scheduledOrders.empty.${activeFilter}`)}
                        </h2>
                        <p className="text-muted-foreground text-sm text-center mb-6">
                            {activeFilter === 'all'
                                ? t('scheduledOrders.empty.message')
                                : t(`scheduledOrders.empty.${activeFilter}Message`)}
                        </p>
                        {activeFilter === 'all' && (
                            <Button onClick={() => window.location.href = '/'}>
                                {t('scheduledOrders.empty.cta')}
                            </Button>
                        )}
                    </div>
                ) : (
                    filteredOrders.map((order, index) => (
                        <ScheduledOrderCard
                            key={order.id}
                            order={order}
                            index={index}
                            onViewDetails={() => handleViewDetails(order)}
                            onCancel={() => handleCancelRequest(order)}
                            onReschedule={() => handleRescheduleRequest(order)}
                        />
                    ))
                )}
            </div>

            {/* Modals */}
            {selectedOrder && (
                <>
                    <OrderDetailsModal
                        order={selectedOrder}
                        open={showDetailsModal}
                        onOpenChange={setShowDetailsModal}
                        onCancel={() => {
                            setShowDetailsModal(false);
                            handleCancelRequest(selectedOrder);
                        }}
                        onReschedule={() => {
                            setShowDetailsModal(false);
                            handleRescheduleRequest(selectedOrder);
                        }}
                    />
                    <CancelConfirmationModal
                        order={selectedOrder}
                        open={showCancelModal}
                        onOpenChange={setShowCancelModal}
                        onConfirm={() => {
                            setShowCancelModal(false);
                            refetch();
                        }}
                    />
                    <RescheduleModal
                        order={selectedOrder}
                        open={showRescheduleModal}
                        onOpenChange={setShowRescheduleModal}
                        onConfirm={() => {
                            setShowRescheduleModal(false);
                            refetch();
                        }}
                    />
                </>
            )}

            <BottomNav />
        </div>
    );
};

export default ScheduledOrdersPage;
