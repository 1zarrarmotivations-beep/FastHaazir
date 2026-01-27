import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePromoBanner } from '@/hooks/usePromoBanner';
import { Skeleton } from '@/components/ui/skeleton';

const PromoBanner: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: banner, isLoading } = usePromoBanner();
  
  const isUrdu = i18n.language === 'ur';

  // Handle click action
  const handleClick = () => {
    if (!banner) return;
    
    switch (banner.click_action) {
      case 'restaurants':
        navigate('/restaurants');
        break;
      case 'categories':
        navigate('/categories');
        break;
      case 'external':
        if (banner.external_url) {
          window.open(banner.external_url, '_blank', 'noopener,noreferrer');
        }
        break;
      default:
        // No action
        break;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <section className="px-4 py-2">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </section>
    );
  }

  // No active banner
  if (!banner) {
    return null;
  }

  // Get localized content
  const heading = isUrdu ? banner.heading_ur : banner.heading_en;
  const description = isUrdu ? banner.description_ur : banner.description_en;

  // Don't render if no content
  if (!heading && !description) {
    return null;
  }

  const isClickable = banner.click_action !== 'none';

  return (
    <section className="px-4 py-2">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        onClick={isClickable ? handleClick : undefined}
        className={`relative overflow-hidden rounded-2xl p-4 ${
          isClickable ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''
        }`}
        style={{
          background: banner.background_type === 'gradient' 
            ? banner.background_value 
            : `url(${banner.background_value}) center/cover`,
          boxShadow: '0 8px 32px -8px rgba(255, 106, 0, 0.3)',
        }}
        whileHover={isClickable ? { scale: 1.01 } : undefined}
        whileTap={isClickable ? { scale: 0.98 } : undefined}
      >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <motion.div 
            className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.3, 0.2]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div 
            className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-white/10"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Subtle Shimmer Effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          }}
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 5,
            ease: 'easeInOut',
          }}
        />

        {/* Content */}
        <div 
          className="relative flex items-center gap-4"
          style={{ direction: isUrdu ? 'rtl' : 'ltr' }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-xs font-medium text-white/90 uppercase tracking-wide ltr-force">
                {t('promo.special', 'خصوصی پیشکش')}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1 leading-relaxed">
              {heading}
            </h3>
            {description && (
              <p className="text-sm text-white/80 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          
          {isClickable && (
            <motion.div
              animate={{ 
                x: isUrdu ? [-3, 3, -3] : [3, -3, 3],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm flex-shrink-0"
            >
              <ChevronRight 
                className={`w-5 h-5 text-white ${isUrdu ? 'rotate-180' : ''}`} 
              />
            </motion.div>
          )}
        </div>

        {/* Floating Emoji */}
        {banner.icon && (
          <motion.div
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-2 text-2xl pointer-events-none"
            style={{ 
              [isUrdu ? 'left' : 'right']: '5rem',
            }}
          >
            {banner.icon}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
};

export default PromoBanner;
