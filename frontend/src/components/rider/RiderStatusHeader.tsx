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
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { RiderProfile } from '@/hooks/useRiderDashboard';

interface RiderStatusHeaderProps {
  riderProfile: RiderProfile;
  isOnline: boolean;
  onToggleOnline: (checked: boolean) => void;
  isToggling: boolean;
  todayEarnings: number;
  walletBalance: number;
  completedToday: number;
}

const RiderStatusHeader = ({
  riderProfile,
  isOnline,
  onToggleOnline,
  isToggling,
  todayEarnings,
  walletBalance,
  completedToday
}: RiderStatusHeaderProps) => {
  return (
    <div className="relative px-4 pt-6 pb-4">
      {/* Glass Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card-dark rounded-3xl p-5 relative overflow-hidden"
      >
        {/* Glow Effect when Online */}
        {isOnline && (
          <motion.div
            className="absolute inset-0 rounded-3xl opacity-30"
            style={{
              background: 'radial-gradient(circle at top right, rgba(0,255,136,0.3) 0%, transparent 60%)',
            }}
            animate={{
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        )}

        {/* Profile Row */}
        <div className="relative flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            {/* Avatar with Status Ring */}
            <motion.div
              className={`relative w-16 h-16 rounded-2xl overflow-hidden ${
                isOnline ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-transparent animate-online-pulse' : ''
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {riderProfile.image ? (
                <img 
                  src={riderProfile.image} 
                  alt={riderProfile.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
              )}
              {/* Online Dot */}
              <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-slate-900 ${
                isOnline ? 'bg-emerald-400' : 'bg-gray-500'
              }`} />
            </motion.div>
            
            <div>
              <h1 className="text-xl font-bold text-white">{riderProfile.name}</h1>
              <div className="flex items-center gap-2 text-sm mt-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold text-white">
                  {riderProfile.rating?.toFixed(1) || '4.5'}
                </span>
                <span className="text-white/40">•</span>
                <span className="text-white/60">
                  {riderProfile.total_trips || 0} trips
                </span>
              </div>
            </div>
          </div>

          {/* Online/Offline Toggle - Premium Glass Button */}
          <motion.button
            onClick={() => !isToggling && onToggleOnline(!isOnline)}
            disabled={isToggling}
            className={`relative flex flex-col items-center gap-1 p-4 rounded-2xl transition-all duration-500 ${
              isOnline 
                ? 'bg-emerald-500/20 glow-green' 
                : 'bg-white/5 hover:bg-white/10'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ 
                rotate: isToggling ? 360 : 0,
                scale: isOnline ? [1, 1.1, 1] : 1
              }}
              transition={{ 
                rotate: { duration: 1, repeat: isToggling ? Infinity : 0 },
                scale: { duration: 2, repeat: Infinity }
              }}
            >
              {isOnline ? (
                <Zap className="w-6 h-6 text-emerald-400 fill-emerald-400" />
              ) : (
                <PowerOff className="w-6 h-6 text-white/40" />
              )}
            </motion.div>
            <span className={`text-xs font-bold tracking-wider ${
              isOnline ? 'text-emerald-400 text-glow-green' : 'text-white/40'
            }`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </motion.button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <GlassStatCard
            icon={<Wallet className="w-5 h-5" />}
            label="Today"
            value={`₨${todayEarnings.toLocaleString()}`}
            color="orange"
          />
          <GlassStatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Balance"
            value={`₨${walletBalance.toLocaleString()}`}
            color="green"
          />
          <GlassStatCard
            icon={<Bike className="w-5 h-5" />}
            label="Trips"
            value={completedToday.toString()}
            color="purple"
          />
        </div>
      </motion.div>
    </div>
  );
};

interface GlassStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'orange' | 'green' | 'purple';
}

const GlassStatCard = ({ icon, label, value, color }: GlassStatCardProps) => {
  const colorStyles = {
    orange: {
      bg: 'bg-orange-500/10',
      icon: 'text-orange-400',
      value: 'text-orange-400',
    },
    green: {
      bg: 'bg-emerald-500/10',
      icon: 'text-emerald-400',
      value: 'text-emerald-400',
    },
    purple: {
      bg: 'bg-purple-500/10',
      icon: 'text-purple-400',
      value: 'text-purple-400',
    },
  };

  const styles = colorStyles[color];

  return (
    <motion.div
      className="glass-card rounded-2xl p-3"
      whileTap={{ scale: 0.98 }}
    >
      <div className={`w-10 h-10 rounded-xl ${styles.bg} flex items-center justify-center mb-2`}>
        <div className={styles.icon}>{icon}</div>
      </div>
      <p className={`text-lg font-bold ${styles.value}`}>{value}</p>
      <p className="text-xs text-white/50">{label}</p>
    </motion.div>
  );
};

export default RiderStatusHeader;
