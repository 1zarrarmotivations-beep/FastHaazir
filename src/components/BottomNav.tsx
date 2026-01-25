import React from 'react';
import { motion } from 'framer-motion';
import { Home, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const BottomNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { icon: Home, labelKey: 'nav.home', path: '/' },
    { icon: ShoppingBag, labelKey: 'nav.orders', path: '/orders' },
    { icon: ClipboardList, labelKey: 'order.orderHistory', path: '/history' },
    { icon: User, labelKey: 'nav.profile', path: '/profile' },
  ];

  return (
    <motion.nav 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-0 left-0 right-0 w-full z-50 glass border-t border-border/50 px-1 pb-safe"
    >
      <div className="flex items-center justify-evenly py-2 max-w-[414px] mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-1 px-2 py-2 min-w-0 flex-1"
            >
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1 : 0.9,
                }}
                className={`relative p-2 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'gradient-primary shadow-elevated' 
                    : 'bg-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl gradient-primary -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </motion.div>
              <span className={`text-[10px] font-medium ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default BottomNav;
