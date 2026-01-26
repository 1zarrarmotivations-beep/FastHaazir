import { motion } from 'framer-motion';
import { 
  Map, 
  Flame, 
  Navigation,
  Clock,
  Package,
  Zap,
  MapPin,
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
      icon: Clock, 
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      glow: 'glow-green'
    },
    on_delivery: { 
      label: 'On Delivery', 
      icon: Package, 
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      glow: 'glow-orange'
    },
    returning: { 
      label: 'Returning', 
      icon: Navigation, 
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      glow: 'glow-purple'
    },
  };

  const currentStatusConfig = statusConfig[currentStatus];
  const StatusIcon = currentStatusConfig.icon;

  return (
    <div className="px-4 py-2 space-y-4">
      {/* Status Indicator - Glass Card */}
      <motion.div
        className={`glass-card rounded-2xl p-4 ${currentStatusConfig.glow}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <motion.div
            className={`w-14 h-14 rounded-2xl ${currentStatusConfig.bg} flex items-center justify-center`}
            animate={{ 
              scale: activeOrdersCount > 0 ? [1, 1.05, 1] : 1 
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <StatusIcon className={`w-7 h-7 ${currentStatusConfig.color}`} />
          </motion.div>
          
          <div className="flex-1">
            <p className={`font-bold text-lg ${currentStatusConfig.color}`}>
              {currentStatusConfig.label}
            </p>
            <p className="text-white/50 text-sm">
              {activeOrdersCount > 0 
                ? `${activeOrdersCount} active order${activeOrdersCount > 1 ? 's' : ''}`
                : pendingOrdersCount > 0 
                  ? `${pendingOrdersCount} orders waiting`
                  : 'No orders right now'
              }
            </p>
          </div>

          {activeOrdersCount > 0 && (
            <motion.div
              className={`w-4 h-4 rounded-full ${currentStatusConfig.color.replace('text-', 'bg-')}`}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </div>
      </motion.div>

      {/* Quick Action Buttons - Glass Grid */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          className="glass-card rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
          whileTap={{ scale: 0.98 }}
          onClick={onOpenHeatmap}
        >
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-white">Heatmap</p>
            <p className="text-xs text-white/50">Find busy zones</p>
          </div>
        </motion.button>

        <motion.button
          className="glass-card rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
          whileTap={{ scale: 0.98 }}
          onClick={onOpenNavigation}
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-blue-400" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-white">Navigate</p>
            <p className="text-xs text-white/50">Open maps</p>
          </div>
        </motion.button>
      </div>
    </div>
  );
};

export default RiderQuickActions;
