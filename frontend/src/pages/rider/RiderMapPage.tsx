import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

// Hooks
import { useMyActiveDeliveries } from '@/hooks/useRiderDashboard';

// Components
import RiderLiveMap from '@/components/rider/RiderLiveMap';

interface OutletContext {
    riderProfile: any | null;
    deviationThreshold: number;
    rerouteDelay: number;
    isOnline: boolean;
    currentSpeed: number;
    isTracking: boolean;
    lastLocation: {
        lat: number;
        lng: number;
        heading: number | null;
        speed: number | null;
        accuracy: number | null;
    } | null;
    activeCount: number;
}

const RiderMapPage: React.FC = () => {
    const navigate = useNavigate();
    const {
        riderProfile,
        isOnline,
        lastLocation,
    } = useOutletContext<OutletContext>();

    // Data fetching
    const { data: activeDeliveries = [] } = useMyActiveDeliveries();

    // Get active delivery
    const activeDelivery = activeDeliveries[0];

    return (
        <div className="relative h-full w-full bg-[#0a0a14] overflow-hidden">
            {/* 
                RiderLiveMap: Ultra-Premium Navigation Module
                - Handles Leaflet, OSRM Routing, Turn-by-Turn Voice, 3D Bike Icon
            */}
            <RiderLiveMap
                riderLat={lastLocation?.lat}
                riderLng={lastLocation?.lng}
                riderHeading={lastLocation?.heading}
                riderSpeed={lastLocation?.speed}
                riderAccuracy={lastLocation?.accuracy}
                pickupLat={activeDelivery?.pickup_lat}
                pickupLng={activeDelivery?.pickup_lng}
                dropoffLat={activeDelivery?.dropoff_lat}
                dropoffLng={activeDelivery?.dropoff_lng}
                pickupAddress={activeDelivery?.pickup_address}
                dropoffAddress={activeDelivery?.dropoff_address}
                deliveryStatus={activeDelivery?.status as any}
                vehicleType={riderProfile?.vehicle_type || 'bike'}
                isFullscreen={false}
                height="100%"
            />

            {/* Float Back Button */}
            <div className="absolute top-4 left-4 z-[1001] flex flex-col gap-2">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => navigate('/rider')}
                    className="w-11 h-11 rounded-2xl bg-[#0a0a14]/90 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white shadow-2xl pointer-events-auto transition-colors hover:bg-[#1a1a2e] hover:border-white/20"
                >
                    <ChevronLeft className="w-5 h-5" />
                </motion.button>

                {/* Status Indicator */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#0a0a14]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-2xl pointer-events-none"
                >
                    <div className="relative">
                        <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-white/10"}`} />
                        {isOnline && (
                            <motion.div
                                animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                                transition={{ duration: 2.5, repeat: Infinity }}
                                className="absolute inset-0 bg-emerald-400 rounded-full"
                            />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white tracking-[0.05em] uppercase">
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default RiderMapPage;
