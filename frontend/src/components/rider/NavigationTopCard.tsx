import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Navigation } from 'lucide-react';

interface NavigationTopCardProps {
    destination: string;
    eta: string;
    distance: string;
    status: 'to_pickup' | 'to_drop';
}

const NavigationTopCard = ({ destination, eta, distance, status }: NavigationTopCardProps) => {
    const statusColor = status === 'to_pickup' ? '#FF6B00' : '#00D68F';
    const statusBgColor = status === 'to_pickup' ? 'bg-[#FF6B00]/20' : 'bg-[#00D68F]/20';
    const statusTextColor = status === 'to_pickup' ? 'text-[#FF6B00]' : 'text-[#00D68F]';
    const statusBgSolid = status === 'to_pickup' ? 'bg-[#FF6B00]' : 'bg-[#00D68F]';

    return (
        <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-4 left-4 right-4 z-50"
        >
            <div className="bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                {/* Status Header */}
                <div className={`px-4 py-2 flex items-center justify-between ${statusBgColor}`}>
                    <div className="flex items-center gap-2">
                        <Navigation className={`w-4 h-4 ${statusTextColor}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${statusTextColor}`}>
                            {status === 'to_pickup' ? 'Pickup' : 'Deliver'}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-white/50" />
                            <span className="text-sm font-bold text-white">{eta}</span>
                        </div>
                        <span className="text-white/20">•</span>
                        <span className="text-sm font-bold text-white">{distance}</span>
                    </div>
                </div>

                {/* Destination Info */}
                <div className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${statusBgSolid}`}>
                        <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-base truncate">
                            {destination || 'Loading...'}
                        </p>
                        <p className="text-white/40 text-xs">
                            Tap to open navigation
                        </p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-0.5 bg-white/5">
                    <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                        className={`h-full ${statusBgSolid}`}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default NavigationTopCard;
