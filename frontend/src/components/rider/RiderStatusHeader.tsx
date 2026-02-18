import { motion } from 'framer-motion';
import {
  Power,
  PowerOff,
  Star,
  Wallet,
  TrendingUp,
  Bike,
  User,
  Zap,
  CheckCircle2,
  Gauge,
} from 'lucide-react';
import { RiderProfile } from '@/hooks/useRiderDashboard';

interface RiderStatusHeaderProps {
  riderProfile: RiderProfile | null | undefined;
  isOnline: boolean;
  onToggleOnline: (checked: boolean) => void;
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
  walletBalance,
  completedToday,
  activeDeliveriesCount = 0,
  currentSpeed = 0
}: RiderStatusHeaderProps) => {
  // Determine if offline toggle should be disabled
  const cannotGoOffline = isOnline && activeDeliveriesCount > 0;
  // Guard against undefined riderProfile - Premium Loading State
  if (!riderProfile) {
    return (
      <div className="relative px-4 pt-6 pb-4">
        <div className="bg-surface rounded-3xl p-6 animate-pulse border border-border">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-18 h-18 rounded-2xl bg-muted shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-muted rounded-xl w-32 shimmer" />
              <div className="h-4 bg-muted rounded-xl w-24 shimmer" />
            </div>
            <div className="w-16 h-16 rounded-2xl bg-muted shimmer" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted rounded-2xl p-4 h-24 shimmer" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative px-4 pt-6 pb-4">
      {/* Premium Glass Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-surface rounded-3xl p-6 relative overflow-hidden border border-border shadow-elevated"
      >
        {/* Animated Gradient Background */}
        {isOnline && (
          <>
            <div
              className="absolute inset-0 opacity-50"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,78,59,0.1) 50%, rgba(6,32,22,0.15) 100%)'
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-3xl opacity-30"
              style={{
                background: 'radial-gradient(circle at top right, rgba(16,185,129,0.3) 0%, transparent 60%)',
              }}
              animate={{
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.div
              className="absolute -top-20 -right-20 w-40 h-40 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            {/* Subtle grid pattern */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            />
          </>
        )}

        {/* Profile Row */}
        <div className="relative flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Premium Avatar with Status Ring */}
            <motion.div
              className="relative"
              whileTap={{ scale: 0.95 }}
            >
              <div className={`w-18 h-18 rounded-2xl overflow-hidden relative ${isOnline
                ? 'ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-transparent animate-ring-glow'
                : 'ring-1 ring-white/10'
                }`}
                style={{ width: '72px', height: '72px' }}
              >
                {riderProfile.image ? (
                  <img
                    src={riderProfile.image}
                    alt={riderProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full gradient-rider-accent flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>
              {/* Premium Status Indicator */}
              <motion.div
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-surface flex items-center justify-center ${isOnline ? 'bg-success' : 'bg-muted-foreground'
                  }`}
                animate={isOnline ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isOnline && <CheckCircle2 className="w-3 h-3 text-white" />}
              </motion.div>
            </motion.div>

            <div>
              <h1 className="text-xl font-bold text-textPrimary tracking-tight">{riderProfile.name}</h1>
              <div className="flex items-center gap-2 text-sm mt-1.5">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10">
                  <Star className="w-3.5 h-3.5 text-secondary fill-secondary" />
                  <span className="font-bold text-secondary">
                    {riderProfile.rating?.toFixed(1) || '5.0'}
                  </span>
                </div>
                <span className="text-textSecondary/30">•</span>
                <span className="text-textSecondary font-medium">
                  {riderProfile.total_trips || 0} trips
                </span>
              </div>
            </div>
          </div>

          {/* Premium Online/Offline Toggle Button */}
          <div className="flex flex-col items-center">
            <motion.button
              onClick={() => !isToggling && !cannotGoOffline && onToggleOnline(!isOnline)}
              disabled={isToggling || cannotGoOffline}
              className={`relative flex flex-col items-center gap-1.5 p-4 rounded-2xl transition-all duration-500 min-w-[80px] ${cannotGoOffline
                ? 'bg-warning/10 cursor-not-allowed opacity-70'
                : isOnline
                  ? 'bg-success/15 glow-green'
                  : 'bg-muted/30 hover:bg-muted/50 border border-border'
                }`}
              whileTap={cannotGoOffline ? {} : { scale: 0.95 }}
            >
              <motion.div
                animate={{
                  rotate: isToggling ? 360 : 0,
                  scale: isOnline && !cannotGoOffline ? [1, 1.1, 1] : 1
                }}
                transition={{
                  rotate: { duration: 1, repeat: isToggling ? Infinity : 0 },
                  scale: { duration: 2.5, repeat: Infinity }
                }}
              >
                {isOnline ? (
                  <Zap className={`w-7 h-7 ${cannotGoOffline ? 'text-warning' : 'text-success'} fill-current drop-shadow-[0_0_8px_hsl(var(--success)/0.6)]`} />
                ) : (
                  <PowerOff className="w-7 h-7 text-textSecondary/30" />
                )}
              </motion.div>
              <span className={`text-[10px] font-black tracking-widest ${cannotGoOffline
                ? 'text-warning'
                : isOnline
                  ? 'text-success text-glow-green'
                  : 'text-textSecondary/30'
                }`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </motion.button>

            {/* Helper text when cannot go offline */}
            {cannotGoOffline && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[9px] text-orange-400/80 mt-1.5 text-center max-w-[90px] leading-tight"
              >
                Complete delivery to go offline
              </motion.p>
            )}
          </div>
        </div>

        {/* Premium Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PremiumStatCard
            icon={<Wallet className="w-5 h-5" />}
            label="Today"
            value={`₨${todayEarnings.toLocaleString()}`}
            color="orange"
          />
          <PremiumStatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Balance"
            value={`₨${walletBalance.toLocaleString()}`}
            color="emerald"
          />
          <PremiumStatCard
            icon={<Bike className="w-5 h-5" />}
            label="Trips"
            value={completedToday.toString()}
            color="purple"
          />
          <PremiumStatCard
            icon={<Gauge className="w-5 h-5" />}
            label="Speed"
            value={`${currentSpeed} km/h`}
            color="cyan"
          />
        </div>
      </motion.div>
    </div>
  );
};

interface PremiumStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'orange' | 'emerald' | 'purple' | 'cyan';
}

const PremiumStatCard = ({ icon, label, value, color }: PremiumStatCardProps) => {
  const colorStyles = {
    orange: {
      bg: 'bg-orange-500/10',
      iconBg: 'bg-orange-500/15',
      icon: 'text-orange-400',
      value: 'text-orange-400',
      glow: 'shadow-[0_0_20px_rgba(255,106,0,0.1)]',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      iconBg: 'bg-emerald-500/15',
      icon: 'text-emerald-400',
      value: 'text-emerald-400',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.1)]',
    },
    purple: {
      bg: 'bg-purple-500/10',
      iconBg: 'bg-purple-500/15',
      icon: 'text-purple-400',
      value: 'text-purple-400',
      glow: 'shadow-[0_0_20px_rgba(139,92,246,0.1)]',
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      iconBg: 'bg-cyan-500/15',
      icon: 'text-cyan-400',
      value: 'text-cyan-400',
      glow: 'shadow-[0_0_20px_rgba(34,211,238,0.1)]',
    },
  };

  const styles = colorStyles[color];

  return (
    <motion.div
      className={`bg-surface rounded-2xl p-4 ${styles.glow} border border-border`}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center mb-3`}>
        <div className={styles.icon}>{icon}</div>
      </div>
      <p className={`text-xl font-bold ${styles.value} tracking-tight`}>{value}</p>
      <p className="text-[11px] text-textSecondary uppercase tracking-wider font-medium mt-0.5">{label}</p>
    </motion.div>
  );
};

export default RiderStatusHeader;