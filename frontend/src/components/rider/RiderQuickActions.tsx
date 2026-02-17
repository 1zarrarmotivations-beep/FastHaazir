import { motion } from 'framer-motion';
import {
  Map,
  Flame,
  Navigation,
  Clock,
  Package,
  Zap,
  MapPin,
  Sparkles,
  Phone,
  HelpCircle,
  Star,
  Award,
  TrendingUp,
  DollarSign,
  Clock3,
} from 'lucide-react';

interface RiderQuickActionsProps {
  onOpenHeatmap: () => void;
  onOpenNavigation: () => void;
  activeOrdersCount: number;
  pendingOrdersCount: number;
  currentStatus: 'idle' | 'on_delivery' | 'returning';
  todayTrips?: number;
  weeklyEarnings?: number;
  onOpenSupport?: () => void;
  onOpenEarnings?: () => void;
}

const RiderQuickActions = ({
  onOpenHeatmap,
  onOpenNavigation,
  activeOrdersCount,
  pendingOrdersCount,
  currentStatus,
  todayTrips = 0,
  weeklyEarnings = 0,
  onOpenSupport,
  onOpenEarnings,
}: RiderQuickActionsProps) => {
  const statusConfig = {
    idle: {
      label: 'Ready for Orders',
      icon: Sparkles,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      glow: 'glow-green',
      gradient: 'from-emerald-500/20 to-cyan-500/10'
    },
    on_delivery: {
      label: 'On Delivery',
      icon: Package,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      glow: 'glow-orange',
      gradient: 'from-orange-500/20 to-red-500/10'
    },
    returning: {
      label: 'Returning',
      icon: Navigation,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      glow: 'glow-purple',
      gradient: 'from-purple-500/20 to-pink-500/10'
    },
  };

  const currentStatusConfig = statusConfig[currentStatus];
  const StatusIcon = currentStatusConfig.icon;

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Premium Status Indicator Card */}
      <motion.div
        className={`glass-card-premium rounded-3xl p-5 border ${currentStatusConfig.borderColor} ${currentStatusConfig.glow} relative overflow-hidden`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Gradient Background */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${currentStatusConfig.gradient} opacity-60`}
          style={{
            background: currentStatus === 'idle'
              ? 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(6,78,59,0.15) 50%, rgba(6,32,22,0.2) 100%)'
              : currentStatus === 'on_delivery'
                ? 'linear-gradient(135deg, rgba(249,115,22,0.2) 0%, rgba(220,38,38,0.15) 50%, rgba(127,29,29,0.2) 100%)'
                : 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(88,28,135,0.15) 50%, rgba(46,10,56,0.2) 100%)'
          }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }}
        />

        <div className="relative flex items-center gap-4">
          <motion.div
            className={`w-16 h-16 rounded-2xl ${currentStatusConfig.bg} flex items-center justify-center border border-white/5`}
            animate={{
              scale: activeOrdersCount > 0 ? [1, 1.05, 1] : 1,
              boxShadow: activeOrdersCount > 0
                ? ['0 0 0 rgba(255,106,0,0)', '0 0 30px rgba(255,106,0,0.3)', '0 0 0 rgba(255,106,0,0)']
                : 'none'
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <StatusIcon className={`w-8 h-8 ${currentStatusConfig.color}`} />
          </motion.div>

          <div className="flex-1">
            <p className={`font-bold text-lg ${currentStatusConfig.color} tracking-tight`}>
              {currentStatusConfig.label}
            </p>
            <p className="text-white/40 text-sm font-medium">
              {activeOrdersCount > 0
                ? `${activeOrdersCount} active delivery${activeOrdersCount > 1 ? 's' : ''}`
                : pendingOrdersCount > 0
                  ? `${pendingOrdersCount} orders waiting`
                  : 'Waiting for orders...'
              }
            </p>
          </div>

          {/* Live Indicator */}
          {activeOrdersCount > 0 && (
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className={`w-4 h-4 rounded-full ${currentStatusConfig.color.replace('text-', 'bg-')}`} />
              <motion.div
                className={`absolute inset-0 rounded-full ${currentStatusConfig.color.replace('text-', 'bg-')}`}
                animate={{
                  scale: [1, 2],
                  opacity: [0.6, 0]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Premium Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          className="glass-card-premium rounded-2xl p-5 flex items-center gap-4 active:scale-[0.98] transition-all duration-200 border border-white/5 hover:border-orange-500/20 group"
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -2 }}
          onClick={onOpenHeatmap}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/10 flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(255,106,0,0.3)] transition-shadow">
            <Flame className="w-7 h-7 text-orange-400" />
          </div>
          <div className="text-left">
            <p className="font-bold text-white text-base">Heatmap</p>
            <p className="text-xs text-white/40 font-medium">Busy zones</p>
          </div>
        </motion.button>

        <motion.button
          className="glass-card-premium rounded-2xl p-5 flex items-center gap-4 active:scale-[0.98] transition-all duration-200 border border-white/5 hover:border-cyan-500/20 group"
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -2 }}
          onClick={onOpenNavigation}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-shadow">
            <MapPin className="w-7 h-7 text-cyan-400" />
          </div>
          <div className="text-left">
            <p className="font-bold text-white text-base">Navigate</p>
            <p className="text-xs text-white/40 font-medium">Open maps</p>
          </div>
        </motion.button>
      </div>

      {/* Enhanced Quick Actions Row */}
      <div className="grid grid-cols-4 gap-2">
        <motion.button
          className="glass-card rounded-xl p-3 flex flex-col items-center gap-1.5 active:scale-95 border border-white/5 hover:border-white/10"
          whileTap={{ scale: 0.95 }}
          onClick={onOpenEarnings}
        >
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <span className="text-[10px] text-white/60 font-medium">Earnings</span>
        </motion.button>

        <motion.button
          className="glass-card rounded-xl p-3 flex flex-col items-center gap-1.5 active:scale-95 border border-white/5 hover:border-white/10"
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Star className="w-5 h-5 text-yellow-400" />
          </div>
          <span className="text-[10px] text-white/60 font-medium">Rating</span>
        </motion.button>

        <motion.button
          className="glass-card rounded-xl p-3 flex flex-col items-center gap-1.5 active:scale-95 border border-white/5 hover:border-white/10"
          whileTap={{ scale: 0.95 }}
          onClick={onOpenSupport}
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-[10px] text-white/60 font-medium">Support</span>
        </motion.button>

        <motion.button
          className="glass-card rounded-xl p-3 flex flex-col items-center gap-1.5 active:scale-95 border border-white/5 hover:border-white/10"
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Award className="w-5 h-5 text-purple-400" />
          </div>
          <span className="text-[10px] text-white/60 font-medium">Awards</span>
        </motion.button>
      </div>

      {/* Weekly Stats Card */}
      <motion.div
        className="glass-card-premium rounded-2xl p-4 border border-white/5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-white/60 font-medium">This Week</p>
          <div className="flex items-center gap-1 text-green-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold">+12%</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-2xl font-bold text-white">₨{weeklyEarnings.toLocaleString()}</p>
            <p className="text-[10px] text-white/40">Total Earnings</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-2xl font-bold text-white">{todayTrips * 7}</p>
            <p className="text-[10px] text-white/40">Total Trips</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RiderQuickActions;