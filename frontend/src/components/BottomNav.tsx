import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, User, Headphones, LayoutGrid, ClipboardList } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";

/**
 * FAST HAAZIR - ELITE NAVIGATION DOCK
 * Ultra-Modern Floating Design with High Contrast & Micro-animations
 */

const navItems = [
  { icon: Home, label: 'Home', path: '/', id: 'home' },
  { icon: ClipboardList, label: 'Orders', path: '/orders', id: 'orders' },
  { icon: LayoutGrid, label: 'Explore', path: '/categories', id: 'center', isCenter: true },
  { icon: Headphones, label: 'Support', path: '/support', id: 'support' },
  { icon: User, label: 'Profile', path: '/profile', id: 'profile' },
];

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6 pointer-events-none z-50">
      <motion.nav
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 150 }}
        className={cn(
          "pointer-events-auto h-20 rounded-[35px] w-full max-w-[420px] px-3 relative",
          "bg-slate-950/95 backdrop-blur-2xl",
          "border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]",
          "flex items-center justify-between"
        )}
      >
        {/* Dynamic Inner Glow */}
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <div key={item.id} className="relative -top-4 flex flex-col items-center">
                <motion.button
                  whileHover={{ scale: 1.15, y: -4 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center",
                    "gradient-primary shadow-[0_12px_30px_-5px_hsla(var(--primary),0.6)]",
                    "border-[6px] border-slate-950 relative z-10"
                  )}
                >
                  <Icon className="w-8 h-8 text-white drop-shadow-md" />

                  {/* Subtle pulsing ring */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-primary -z-10"
                  />
                </motion.button>

                <span className={cn(
                  "text-[10px] mt-1 font-bold transition-all duration-300 uppercase tracking-tighter",
                  isActive ? "text-primary translate-y-0" : "text-slate-500 translate-y-1"
                )}>
                  {item.label}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="activeDotCenter"
                    className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shadow-[0_0_12px_hsla(var(--primary),1)]"
                  />
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.id}
              to={item.path}
              className="relative flex flex-col items-center justify-center h-full flex-1 group"
            >
              <motion.div
                whileTap={{ scale: 0.8 }}
                className={cn(
                  "relative p-2.5 rounded-2xl flex items-center justify-center transition-all duration-300",
                  isActive ? "text-primary bg-white/5" : "text-slate-400"
                )}
              >
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="activePill"
                      className="absolute inset-0 rounded-2xl bg-primary/10 border border-primary/20 -z-10"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                    />
                  )}
                </AnimatePresence>

                <Icon
                  className={cn(
                    "w-6 h-6 transition-all duration-300",
                    isActive
                      ? "text-primary scale-110 filter drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                      : "opacity-60 group-hover:opacity-100 group-hover:text-slate-200"
                  )}
                />
              </motion.div>

              <span className={cn(
                "text-[10px] mt-0.5 font-bold transition-all duration-300 uppercase tracking-tighter",
                isActive ? "text-primary opacity-100" : "text-slate-500 opacity-70 group-hover:opacity-100"
              )}>
                {item.label}
              </span>

              {isActive && (
                <motion.div
                  layoutId="activeDot"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_hsla(var(--primary),1)]"
                />
              )}
            </Link>
          );
        })}
      </motion.nav>
    </div>
  );
};

export default BottomNav;
