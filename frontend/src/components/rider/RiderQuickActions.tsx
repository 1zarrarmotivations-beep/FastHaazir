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
} from 'lucide-react';

interface RiderQuickActionsProps {
  onOpenHeatmap: () => void;
  onOpenNavigation: () => void;
  activeOrdersCount: number;
  pendingOrdersCount: number;
  currentStatus: 'idle' | 'on_delivery' | 'returning';
}

const RiderQuickActions = ({
  onOpenHeatmap,
  onOpenNavigation,
  activeOrdersCount,
  pendingOrdersCount,
  currentStatus
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
        <div className={`absolute inset-0 bg-gradient-to-br ${currentStatusConfig.gradient} opacity-50`} />
        
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
    </div>
  );
};

export default RiderQuickActions;