import { motion } from 'framer-motion';
import { 
  Map, 
  Flame, 
  Navigation,
  Clock,
  Package,
  DollarSign
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
    idle: { label: 'Ready for Orders', icon: Clock, color: 'text-accent bg-accent/10' },
    on_delivery: { label: 'On Delivery', icon: Package, color: 'text-primary bg-primary/10' },
    returning: { label: 'Returning', icon: Navigation, color: 'text-secondary bg-secondary/10' },
  };

  const currentStatusConfig = statusConfig[currentStatus];
  const StatusIcon = currentStatusConfig.icon;

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Status Indicator */}
      <motion.div
        className={`flex items-center gap-3 p-4 rounded-2xl ${currentStatusConfig.color}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <StatusIcon className="w-6 h-6" />
        <div className="flex-1">
          <p className="font-semibold">{currentStatusConfig.label}</p>
          <p className="text-xs opacity-80">
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
            className="w-3 h-3 rounded-full bg-current"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          className="flex items-center gap-3 p-4 bg-card rounded-2xl shadow-soft hover:shadow-card transition-all"
          whileTap={{ scale: 0.98 }}
          onClick={onOpenHeatmap}
        >
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Flame className="w-6 h-6 text-orange-500" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-foreground">Heatmap</p>
            <p className="text-xs text-muted-foreground">Find busy zones</p>
          </div>
        </motion.button>

        <motion.button
          className="flex items-center gap-3 p-4 bg-card rounded-2xl shadow-soft hover:shadow-card transition-all"
          whileTap={{ scale: 0.98 }}
          onClick={onOpenNavigation}
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Map className="w-6 h-6 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-foreground">Navigate</p>
            <p className="text-xs text-muted-foreground">Open maps</p>
          </div>
        </motion.button>
      </div>
    </div>
  );
};

export default RiderQuickActions;
