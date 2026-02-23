import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    MapPin,
    Navigation,
    Clock,
    ChevronRight,
    Package,
    Wallet,
    Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Hooks
import {
    useRiderProfile,
    usePendingRequests,
    useMyActiveDeliveries,
    RiderProfile,
    RiderRequest,
} from '@/hooks/useRiderDashboard';
import { useRiderEarningsSummary } from '@/hooks/useRiderPayments';
import { useRiderLocation } from '@/hooks/useRiderLocation';

// Components
import RiderStatusHeader from '@/components/rider/RiderStatusHeader';
import SpeedMeter from '@/components/rider/SpeedMeter';
import RiderOrderRequestCard from '@/components/rider/RiderOrderRequestCard';

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

const RiderHomePage: React.FC = () => {
    const navigate = useNavigate();
    const {
        riderProfile,
        isOnline,
        onToggleOnline,
        isToggling,
        currentSpeed,
        isTracking,
        lastLocation,
        activeCount,
        handleAccept,
        handleReject,
    } = useOutletContext<OutletContext>();

    // Fetch additional data
    const { data: pendingRequests = [] } = usePendingRequests();
    const { data: activeDeliveries = [] } = useMyActiveDeliveries();
    const { data: earningsSummary } = useRiderEarningsSummary(riderProfile?.id);

    // Get today's earnings
    const todayEarnings = earningsSummary?.totalEarnings || 0;
    const completedToday = earningsSummary?.totalDeliveries || 0;

    // Get pending and active deliveries
    const hasActiveDelivery = activeDeliveries.length > 0;
    const activeDelivery = activeDeliveries[0];
    const pendingPreview = pendingRequests.slice(0, 2);

    // Status Header
    return (
        <div className="min-h-full pb-32 pt-2 relative overflow-hidden">
            {/* Ambient Background Glows - Pure Beauty */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[30%] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

            {/* Status Header */}
            <RiderStatusHeader
                riderProfile={riderProfile}
                isOnline={isOnline}
                onToggleOnline={onToggleOnline}
                isToggling={isToggling}
                todayEarnings={todayEarnings}
                walletBalance={0}
                completedToday={completedToday}
                activeDeliveriesCount={activeCount}
            />

            {/* SpeedMeter - Main Focal Point */}
            <div className="flex justify-center py-2 relative z-10">
                <SpeedMeter
                    externalSpeed={currentSpeed}
                    externalHeading={lastLocation?.heading}
                    externalAccuracy={lastLocation?.accuracy}
                    isTracking={isTracking}
                />
            </div>

            {/* Unified Stats Bar - Lighter & Easier */}
            <div className="px-6 py-2 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-3 gap-0.5 bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-[32px] overflow-hidden p-1 shadow-2xl"
                >
                    {/* Today's Earnings */}
                    <div className="bg-white/[0.02] hover:bg-white/[0.05] transition-colors p-4 flex flex-col items-center">
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5">Earnings</span>
                        <p className="text-base font-black text-white leading-none">₨{todayEarnings.toLocaleString()}</p>
                    </div>

                    {/* Deliveries */}
                    <div className="bg-white/[0.02] hover:bg-white/[0.05] transition-colors p-4 flex flex-col items-center border-x border-white/5">
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5">Trips</span>
                        <p className="text-base font-black text-white leading-none">{completedToday}</p>
                    </div>

                    {/* Rating */}
                    <div className="bg-white/[0.02] hover:bg-white/[0.05] transition-colors p-4 flex flex-col items-center">
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5">Rating</span>
                        <div className="flex items-center gap-1 leading-none">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <p className="text-base font-black text-white">{riderProfile?.rating?.toFixed(1) || '5.0'}</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Active Delivery Focus Card */}
            {hasActiveDelivery && activeDelivery && (
                <div className="px-6 py-4 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/[0.03] backdrop-blur-[40px] border border-white/5 rounded-[36px] p-7 shadow-2xl relative overflow-hidden"
                    >
                        {/* Decorative Background Glow for Active Card */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 blur-[40px] rounded-full pointer-events-none" />

                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.5)]" />
                                <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">Active Mission</span>
                            </div>
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.1em]">{activeDelivery.status}</span>
                        </div>

                        {/* Route Info - Refined & Clear */}
                        <div className="space-y-6 mb-8 mt-2">
                            <div className="flex items-start gap-4">
                                <div className="flex flex-col items-center mt-1">
                                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                                    <div className="w-px h-10 bg-gradient-to-b from-emerald-400/20 to-rose-400/20" />
                                    <div className="w-2.5 h-2.5 bg-rose-400 rounded-full shadow-[0_0_8px_rgba(251,113,133,0.4)]" />
                                </div>
                                <div className="flex-1 space-y-5">
                                    <div>
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1.5">Pickup Origin</p>
                                        <p className="text-sm font-black text-white/90 line-clamp-1">{activeDelivery.pickup_address}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1.5">Destination</p>
                                        <p className="text-sm font-black text-white/90 line-clamp-1">{activeDelivery.dropoff_address}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons - Tactile */}
                        <Button
                            onClick={() => navigate('/rider/map')}
                            className="w-full bg-white text-black hover:bg-white/90 font-black rounded-[20px] h-14 text-xs uppercase tracking-widest shadow-xl transition-all active:scale-[0.98]"
                        >
                            <Navigation className="w-4 h-4 mr-2" />
                            Launch Navigator
                        </Button>
                    </motion.div>
                </div>
            )}

            {/* Pending Orders Preview area - Lighter touch */}
            {!hasActiveDelivery && pendingPreview.length > 0 && (
                <div className="px-6 py-4 relative z-10">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Nearby Requests</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/rider/orders')}
                            className="text-white/40 hover:text-white/80 h-auto p-0 hover:bg-transparent"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest mr-1">View All</span>
                            <ChevronRight className="w-3 h-3" />
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {pendingPreview.map((request: RiderRequest) => (
                            <RiderOrderRequestCard
                                key={request.id}
                                request={request}
                                variant="new"
                                onAccept={(id, type) => handleAccept(id, type)}
                                onReject={(id) => handleReject(id)}
                                isLoading={false}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State - Minimal & Airy */}
            {!hasActiveDelivery && pendingPreview.length === 0 && isOnline && (
                <div className="px-6 py-12 flex flex-col items-center justify-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mb-6 border border-white/5"
                    >
                        <MapPin className="w-6 h-6 text-white/20" />
                    </motion.div>
                    <p className="text-[10px] font-black text-white/30 text-center uppercase tracking-[0.2em] max-w-[200px] leading-relaxed">
                        Scanning for missions in your proximity...
                    </p>
                </div>
            )}
        </div>
    );
};

export default RiderHomePage;
