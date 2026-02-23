import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, ChevronDown, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../notifications/NotificationBell';
import NotificationsSheet from '../notifications/NotificationsSheet';
import LanguageToggle from '../LanguageToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { useUserRole } from '@/hooks/useAdmin';
import { useDefaultAddress, CustomerAddress } from '@/hooks/useCustomerAddresses';
import AddressSelector from '@/components/profile/AddressSelector';
import fastHaazirLogo from '@/assets/fast-haazir-logo-optimized.webp';
import { Bike } from 'lucide-react';

interface CustomerHeaderProps {
  onSearchClick?: () => void;
}

const CustomerHeader: React.FC<CustomerHeaderProps> = ({ onSearchClick }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useCustomerProfile();
  const { data: userRole } = useUserRole();
  const { data: defaultAddress } = useDefaultAddress();
  const role = userRole?.role || 'customer';
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showAddressSelector, setShowAddressSelector] = useState(false);

  // Get display address
  const displayAddress = defaultAddress?.address_text || 'Quetta, Pakistan';

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
              <button
                onClick={() => setShowAddressSelector(true)}
                className="flex flex-col hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{t('home.deliverTo')}</span>
                  <ChevronDown className="w-3 h-3" />
                </div>
                <p className="font-semibold text-sm text-foreground text-left max-w-[150px] truncate">
                  {displayAddress.split(',')[0]}
                </p>
              </button>
            </div>

            {/* Right Side - Language, Notifications, Profile */}
            <div className="flex items-center gap-2">
              {/* Switch to Rider Button - MORE PROMINENT */}
              {role === 'rider' && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => navigate('/rider')}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-full shadow-glow-md hover:bg-emerald-500 transition-all border-2 border-emerald-400/30 flex items-center gap-2"
                >
                  <Bike className="w-4 h-4" />
                  RIDER DASHBOARD
                </motion.button>
              )}

              {/* Switch to Admin Button */}
              {role === 'admin' && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => navigate('/admin')}
                  className="px-4 py-2 bg-purple-600 text-white text-xs font-black rounded-full shadow-glow-md hover:bg-purple-500 transition-all border-2 border-purple-400/30 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  ADMIN
                </motion.button>
              )}

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

      {/* Address Selector */}
      <AddressSelector
        open={showAddressSelector}
        onOpenChange={setShowAddressSelector}
        selectedAddressId={defaultAddress?.id}
        onSelect={(address: CustomerAddress) => {
          // Address selected - could trigger a callback or store in context
          setShowAddressSelector(false);
        }}
        onAddNew={() => {
          // Navigate to saved addresses page
          setShowAddressSelector(false);
          navigate('/profile?screen=addresses');
        }}
      />
    </>
  );
};

export default CustomerHeader;
