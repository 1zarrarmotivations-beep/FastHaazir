import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../notifications/NotificationBell';
import NotificationsSheet from '../notifications/NotificationsSheet';
import LanguageToggle from '../LanguageToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import fastHaazirLogo from '@/assets/fast-haazir-logo-optimized.webp';

interface CustomerHeaderProps {
  onSearchClick?: () => void;
}

const CustomerHeader: React.FC<CustomerHeaderProps> = ({ onSearchClick }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useCustomerProfile();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greeting_morning', 'صبح بخیر');
    if (hour < 17) return t('home.greeting_afternoon', 'دوپہر بخیر');
    if (hour < 21) return t('home.greeting_evening', 'شام بخیر');
    return t('home.greeting_night', 'شب بخیر');
  };

  const displayName = profile?.name || t('common.guest', 'مہمان');

  return (
    <>
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 customer-header-glass"
      >
        {/* Top Bar - Logo, Profile, Notifications */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            {/* Logo & Location */}
            <div className="flex items-center gap-3">
              <motion.img 
                src={fastHaazirLogo} 
                alt="Fast Haazir" 
                className="w-11 h-11 object-contain rounded-xl shadow-soft"
                width={44}
                height={44}
                whileTap={{ scale: 0.95 }}
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{t('home.deliverTo')}</span>
                  <ChevronDown className="w-3 h-3" />
                </div>
                <p className="font-semibold text-sm text-foreground">Quetta, Pakistan</p>
              </div>
            </div>

            {/* Right Side - Language, Notifications, Profile */}
            <div className="flex items-center gap-2">
              <LanguageToggle variant="compact" />
              
              <motion.div 
                whileTap={{ scale: 0.9 }}
                className="w-9 h-9 rounded-xl customer-glass-button flex items-center justify-center"
              >
                <NotificationBell onClick={() => setNotificationsOpen(true)} />
              </motion.div>

              {user && (
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate('/profile')}
                  className="cursor-pointer"
                >
                  <Avatar className="w-9 h-9 border-2 border-primary/20">
                    <AvatarImage src={profile?.profile_image || undefined} alt={displayName} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Greeting Section */}
        <div className="px-4 pb-2">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-xs text-muted-foreground">
              {getGreeting()}, <span className="font-medium text-foreground">{displayName}</span> 👋
            </p>
            <h1 className="text-lg font-bold text-foreground mt-0.5">
              {t('home.whatWouldYouLike', 'آج کیا منگوانا ہے؟')} 🍕
            </h1>
          </motion.div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <motion.div 
            className="relative"
            whileTap={{ scale: 0.98 }}
            onClick={onSearchClick}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <div
              className="w-full h-12 pl-12 pr-4 rounded-2xl customer-search-bar flex items-center cursor-pointer"
            >
              <span className="text-sm text-muted-foreground">
                {t('home.searchPlaceholder', 'پیزا، برگر، بریانی تلاش کریں...')}
              </span>
            </div>
          </motion.div>
        </div>
      </motion.header>

      <NotificationsSheet 
        open={notificationsOpen} 
        onOpenChange={setNotificationsOpen} 
      />
    </>
  );
};

export default CustomerHeader;
