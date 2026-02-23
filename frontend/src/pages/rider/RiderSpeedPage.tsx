import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import SpeedMeter from '@/components/rider/SpeedMeter';
import { RiderProfile } from '@/hooks/useRiderDashboard';

interface OutletContext {
    riderProfile: RiderProfile | null;
    isOnline: boolean;
    currentSpeed: number;
    isTracking: boolean;
    lastLocation: any;
}

const RiderSpeedPage: React.FC = () => {
    const { isOnline, isTracking, lastLocation, currentSpeed } = useOutletContext<OutletContext>();

    return (
        <div className="min-h-full flex flex-col items-center justify-center bg-black p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-white uppercase tracking-[0.2em]">Tactical Velocity</h1>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-2">Real-time GPS Telemetry</p>
                </div>

                <div className="flex justify-center">
                    <SpeedMeter
                        isTracking={isTracking}
                        externalSpeed={currentSpeed}
                        externalHeading={lastLocation?.heading}
                        externalAccuracy={lastLocation?.accuracy}
                    />
                </div>

                {!isOnline && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-12 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-center"
                    >
                        <p className="text-orange-400 text-sm font-bold">Rider is Offline</p>
                        <p className="text-white/40 text-xs mt-1">Go online to enable live speed tracking</p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default RiderSpeedPage;
