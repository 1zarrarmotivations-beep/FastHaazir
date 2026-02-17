import { motion } from 'framer-motion';
import {
  Home,
  Package,
  Wallet,
  User,
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
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-40 glass-nav safe-area-bottom border-t border-white/10"
    >
      <div className="flex justify-around items-center h-20 max-w-md mx-auto px-2">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center w-[72px] h-[64px] rounded-2xl"
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Active Background Glow */}
              {isActive && (
                <motion.div
                  layoutId="activeTabBg"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-t from-orange-500/20 to-transparent"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              {/* Active Top Indicator - Premium Neon */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -top-0.5 w-10 h-1 rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-red-400"
                  style={{
                    boxShadow: '0 0 12px rgba(255,106,0,0.6), 0 0 24px rgba(255,106,0,0.3)'
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              <div className="relative z-10">
                <Icon
                  className={`w-6 h-6 transition-all duration-300 ${isActive
                      ? 'text-orange-400'
                      : 'text-white/35 group-hover:text-white/50'
                    }`}
                  style={isActive ? {
                    filter: 'drop-shadow(0 0 8px rgba(255,106,0,0.6))'
                  } : {}}
                  strokeWidth={isActive ? 2.5 : 2}
                />

                {/* Premium Badge */}
                {tab.badge && tab.badge > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-2.5 min-w-[20px] h-[20px] bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5"
                    style={{
                      boxShadow: '0 0 12px rgba(255,106,0,0.5)'
                    }}
                  >
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </motion.div>
                )}
              </div>

              <span className={`text-[10px] mt-1.5 font-semibold transition-colors z-10 ${isActive ? 'text-orange-400' : 'text-white/35'
                }`}>
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