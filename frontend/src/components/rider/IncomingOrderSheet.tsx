import { motion, AnimatePresence } from 'framer-motion';
import { RiderRequest } from '@/hooks/useRiderDashboard';
import { X, ChevronRight, MapPin, Navigation, Package, Shield, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';

interface IncomingOrderSheetProps {
    request: RiderRequest | null;
    onAccept: (id: string, type: 'rider_request' | 'order' | 'grocery') => void;

    onReject: (id: string) => void;
    isLoading?: boolean;
}

export const IncomingOrderSheet = ({ request, onAccept, onReject, isLoading }: IncomingOrderSheetProps) => {
    const [timeLeft, setTimeLeft] = useState(60);

    useEffect(() => {
        if (request) {
            setTimeLeft(60);
            const timer = setInterval(() => {
                setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [request]);

    if (!request) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10 pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.9 }}
                    className="w-full max-w-md bg-[#0E0E0E] rounded-[3rem] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] pointer-events-auto overflow-hidden relative"
                >
                    {/* Progress Timer Head */}
                    <div className="h-1.5 w-full bg-white/5">
                        <motion.div
                            initial={{ width: '100%' }}
                            animate={{ width: `${(timeLeft / 60) * 100}%` }}
                            className="h-full bg-orange-500 shadow-[0_0_15px_rgba(255,106,0,0.8)]"
                        />
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-orange-500/10 text-orange-500 border-none font-black uppercase tracking-widest text-[10px]">New Mission</Badge>
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{timeLeft}S EXPIRES</span>
                                </div>
                                <h3 className="text-3xl font-black italic tracking-tighter text-white">Incoming Request</h3>
                            </div>
                            <button
                                onClick={() => onReject(request.id)}
                                className="p-3 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-white transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Logistics Area */}
                        <div className="bg-[#121212] rounded-[2rem] p-6 border border-white/5 space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                    <MapPin className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Pickup Location</p>
                                    <p className="text-sm font-bold text-white/90 line-clamp-2">{request.pickup_address}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                                    <Navigation className="w-5 h-5 text-rose-500" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest">Delivery Distance</p>
                                    <p className="text-sm font-bold text-white/90 italic italic">Encryption Active till Pickup</p>
                                </div>
                            </div>
                        </div>

                        {/* Earnings Card */}
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                                    <Package className="w-7 h-7 text-white/40" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Est. Earnings</p>
                                    <p className="text-2xl font-black italic text-emerald-400 font-mono">₨{request.rider_earning || request.total}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Payment</p>
                                <p className="text-sm font-black text-white uppercase tracking-tighter italic">CASH ON DEL.</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => onReject(request.id)}
                                className="h-16 w-20 rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all shadow-xl"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <button
                                onClick={() => onAccept(request.id, request.type || 'rider_request')}
                                disabled={isLoading}
                                className="flex-1 h-16 rounded-[1.5rem] bg-orange-500 text-white font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(255,106,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        ACCEPT MISSION
                                        <ChevronRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
