import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package,
    Clock,
    CheckCircle2,
    RefreshCw,
    MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Hooks
import {
    usePendingRequests,
    useMyActiveDeliveries,
    useMyCompletedDeliveries,
    useAcceptRequest,
    useUpdateDeliveryStatus,
    RiderRequest,
    RiderProfile,
    OrderStatus,
} from '@/hooks/useRiderDashboard';

// Components
import RiderOrderRequestCard from '@/components/rider/RiderOrderRequestCard';

type TabType = 'pending' | 'active' | 'completed';

interface OutletContext {
    riderProfile: RiderProfile | null;
    isOnline: boolean;
    onToggleOnline: (checked: boolean) => void;
    isToggling: boolean;
    currentSpeed: number;
    isTracking: boolean;
    locationStatus: string;
    lastLocation: any;
    pendingCount: number;
    activeCount: number;
    profileLoading: boolean;
    handleAccept: (id: string, type: 'rider_request' | 'order') => Promise<void>;
    handleReject: (id: string) => void;
}

const RiderOrdersPage: React.FC = () => {
    const navigate = useNavigate();
    const { riderProfile, isOnline } = useOutletContext<OutletContext>();

    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>('pending');

    // Data fetching
    const { data: pendingRequests = [], isLoading: isPendingLoading, refetch: refetchPending } = usePendingRequests();
    const { data: activeDeliveries = [], isLoading: isActiveLoading, refetch: refetchActive } = useMyActiveDeliveries();
    const { data: completedDeliveries = [], isLoading: isCompletedLoading, refetch: refetchCompleted } = useMyCompletedDeliveries();

    // Mutations
    const acceptRequest = useAcceptRequest();
    const updateStatus = useUpdateDeliveryStatus();

    // Get orders based on active tab
    const getCurrentOrders = (): RiderRequest[] => {
        switch (activeTab) {
            case 'pending':
                return pendingRequests;
            case 'active':
                return activeDeliveries;
            case 'completed':
                return completedDeliveries;
            default:
                return [];
        }
    };

    const currentOrders = getCurrentOrders();
    const isLoading = activeTab === 'pending' ? isPendingLoading :
        activeTab === 'active' ? isActiveLoading : isCompletedLoading;

    // Handle refresh
    const handleRefresh = () => {
        switch (activeTab) {
            case 'pending':
                refetchPending();
                break;
            case 'active':
                refetchActive();
                break;
            case 'completed':
                refetchCompleted();
                break;
        }
    };

    // Handle accept request
    const handleAccept = async (id: string, type: 'rider_request' | 'order' | 'grocery') => {
        try {
            await acceptRequest.mutateAsync({ requestId: id, requestType: type });
            navigate('/rider/map');
        } catch (error) {
            console.error('Error accepting request:', error);
        }
    };

    // Handle update status
    const handleUpdateStatus = async (id: string, status: OrderStatus, type: 'rider_request' | 'order' | 'grocery') => {
        try {
            await updateStatus.mutateAsync({ requestId: id, status, requestType: type });
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    // Empty state component
    const EmptyState = ({ tab }: { tab: TabType }) => {
        const content = {
            pending: {
                icon: Package,
                title: 'No Pending Orders',
                description: isOnline ? 'Looking for nearby orders...' : 'Go online to receive orders',
            },
            active: {
                icon: Clock,
                title: 'No Active Deliveries',
                description: 'Accept an order to start delivering',
            },
            completed: {
                icon: CheckCircle2,
                title: 'No Completed Deliveries',
                description: 'Complete your first delivery to see it here',
            },
        };

        const { icon: Icon, title, description } = content[tab];

        return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Icon className="w-10 h-10 text-white/20" />
                </div>
                <h3 className="text-lg font-bold text-white/60 mb-2">{title}</h3>
                <p className="text-sm text-white/40 text-center">{description}</p>
            </div>
        );
    };

    // Tab configuration
    const tabs: { id: TabType; label: string; count: number }[] = [
        { id: 'pending', label: 'Pending', count: pendingRequests.length },
        { id: 'active', label: 'Active', count: activeDeliveries.length },
        { id: 'completed', label: 'Completed', count: completedDeliveries.length },
    ];

    // Get variant based on tab
    const getVariant = (tab: TabType): 'new' | 'active' | 'completed' => {
        switch (tab) {
            case 'pending':
                return 'new';
            case 'active':
                return 'active';
            case 'completed':
                return 'completed';
        }
    };

    return (
        <div className="min-h-full pb-24 pt-2">
            {/* Header */}
            <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-black text-white">Orders</h1>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        className="text-white/40 hover:text-white"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white/5 p-1 rounded-2xl">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={activeTab === tab.id
                                ? 'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all bg-orange-500 text-white'
                                : 'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all text-white/40 hover:text-white'
                            }
                        >
                            <span className="font-bold text-sm">{tab.label}</span>
                            {tab.count > 0 && (
                                <span className={activeTab === tab.id
                                    ? 'text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white'
                                    : 'text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/60'
                                }>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            <div className="px-4 py-2">
                <AnimatePresence mode="wait">
                    {currentOrders.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <EmptyState tab={activeTab} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                        >
                            {currentOrders.map((request: RiderRequest) => (
                                <RiderOrderRequestCard
                                    key={request.id}
                                    request={request}
                                    variant={getVariant(activeTab)}
                                    onAccept={(id, type) => handleAccept(id, type)}
                                    onUpdateStatus={(id, status, type) => handleUpdateStatus(id, status, type)}
                                    isLoading={acceptRequest.isPending || updateStatus.isPending}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default RiderOrdersPage;
