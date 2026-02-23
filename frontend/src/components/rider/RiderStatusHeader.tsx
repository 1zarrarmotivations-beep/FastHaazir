import { motion } from 'framer-motion';
import { Power, Loader2, Wallet, Clock } from 'lucide-react';
import { RiderProfile } from '@/hooks/useRiderDashboard';
import { cn } from '@/lib/utils';

interface RiderStatusHeaderProps {
  riderProfile: RiderProfile | null | undefined;
  isOnline: boolean;
  onToggleOnline: (checked: boolean) => void;
  onOpenSettings?: () => void;
  isToggling: boolean;
  todayEarnings: number;
  walletBalance: number;
  completedToday: number;
  activeDeliveriesCount?: number;
  currentSpeed?: number;
}

const RiderStatusHeader = ({
  riderProfile,
  isOnline,
  onToggleOnline,
  isToggling,
  todayEarnings,
  activeDeliveriesCount = 0,
}: RiderStatusHeaderProps) => {
  const cannotGoOffline = isOnline && activeDeliveriesCount > 0;

  if (!riderProfile) {
    return (
      <div className="px-4 py-3">
        <div className="h-12 bg-white/5 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-2">
      {/* Premium Airy HUD Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-white/[0.03] backdrop-blur-[32px] border border-white/5 rounded-[28px] px-6 py-5 flex items-center justify-between"
      >
        {/* Soft Ambient Background Glow */}
        <div className={cn(
          "absolute inset-0 opacity-10 transition-colors duration-1000 blur-3xl",
          isOnline ? "bg-emerald-500" : "bg-orange-500/20"
        )} />

        {/* Left: Refined Status Info */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative flex items-center justify-center">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full",
              isOnline ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]" : "bg-white/10"
            )} />
            {isOnline && (
              <motion.div
                animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                className="absolute w-2.5 h-2.5 bg-emerald-400 rounded-full"
              />
            )}
          </div>
          <div className="flex flex-col">
            <span className={cn(
              "text-[9px] font-black uppercase tracking-[0.25em] mb-0.5",
              isOnline ? "text-emerald-400/80" : "text-white/20"
            )}>
              {isOnline ? "Status: Online" : "Status: Offline"}
            </span>
            <span className="text-white text-base font-black tracking-tight leading-none">
              {riderProfile.name?.split(' ')[0] || 'Rider-1'}
            </span>
          </div>
        </div>

        {/* Right: Tactile Toggle Control */}
        <div className="flex items-center gap-4 relative z-10">
          {/* Desktop Stats (Hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-6 mr-6 border-r border-white/5 pr-6">
            <div className="text-right">
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Today</p>
              <p className="text-sm font-black text-white">₨{todayEarnings}</p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => !isToggling && !cannotGoOffline && onToggleOnline(!isOnline)}
            disabled={isToggling || cannotGoOffline}
            className={cn(
              "relative w-16 h-8 rounded-full flex items-center transition-all duration-500 overflow-hidden",
              isOnline
                ? "bg-emerald-500/10 border border-emerald-500/30"
                : "bg-white/5 border border-white/10"
            )}
          >
            {/* Visual Slide Effect */}
            <motion.div
              initial={false}
              animate={{
                x: isOnline ? 34 : 4,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center shadow-lg pointer-events-none",
                isOnline ? "bg-emerald-400" : "bg-white/20"
              )}
            >
              {isToggling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Power className={cn("w-3.5 h-3.5 font-bold", isOnline ? "text-emerald-950" : "text-white/40")} />
              )}
            </motion.div>

            {/* Active Text State */}
            <span className={cn(
              "absolute text-[9px] font-black uppercase tracking-widest transition-all duration-500 pointer-events-none",
              isOnline ? "left-3 text-emerald-400/60 opacity-100" : "right-3 text-white/20 opacity-100"
            )}>
              {isOnline ? "On" : "Off"}
            </span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default RiderStatusHeader;
