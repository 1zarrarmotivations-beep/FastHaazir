import { motion } from 'framer-motion';
import { 
  Home, 
  Package, 
  Wallet, 
  User,
  Map,
  History
} from 'lucide-react';

export type RiderTab = 'home' | 'orders' | 'earnings' | 'profile';

interface RiderBottomNavProps {
  activeTab: RiderTab;
  onTabChange: (tab: RiderTab) => void;
  pendingCount: number;
  activeCount: number;
}

const RiderBottomNav = ({ activeTab, onTabChange, pendingCount, activeCount }: RiderBottomNavProps) => {
  const tabs: { id: RiderTab; label: string; icon: typeof Home; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'orders', label: 'Orders', icon: Package, badge: pendingCount + activeCount },
    { id: 'earnings', label: 'Earnings', icon: Wallet },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom"
    >
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              whileTap={{ scale: 0.9 }}
            >
              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-1 w-8 h-1 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
                
                {/* Badge */}
                {tab.badge && tab.badge > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center px-1"
                  >
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </motion.div>
                )}
              </div>

              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-primary' : ''}`}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default RiderBottomNav;
