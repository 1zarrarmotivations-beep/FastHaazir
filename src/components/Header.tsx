import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Search } from 'lucide-react';
import NotificationBell from './notifications/NotificationBell';
import NotificationsSheet from './notifications/NotificationsSheet';
import fastHaazirLogo from '@/assets/fast-haazir-logo-optimized.webp';

const Header: React.FC = () => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <>
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 glass border-b border-border/50"
      >
        <div className="px-4 py-3">
          {/* Logo and Location Bar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <img 
                src={fastHaazirLogo} 
                alt="Fast Haazir" 
                className="w-12 h-12 object-contain"
                width={48}
                height={48}
              />
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Deliver to
                </p>
                <p className="font-semibold text-sm text-foreground">Quetta, Pakistan</p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-card shadow-soft flex items-center justify-center">
              <NotificationBell onClick={() => setNotificationsOpen(true)} />
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search restaurants, groceries..."
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-card shadow-soft border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>
      </motion.header>

      <NotificationsSheet 
        open={notificationsOpen} 
        onOpenChange={setNotificationsOpen} 
      />
    </>
  );
};

export default Header;
