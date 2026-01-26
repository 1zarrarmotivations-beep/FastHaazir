import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Sparkles } from 'lucide-react';

const PromoBanner: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="px-4 py-2">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl customer-promo-card p-4"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20" />
          <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
        </div>

        {/* Content */}
        <div className="relative flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-xs font-medium text-white/90 uppercase tracking-wide">
                {t('promo.special', 'خصوصی پیشکش')}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {t('promo.freeDelivery', 'پہلے آرڈر پر مفت ڈیلیوری!')}
            </h3>
            <p className="text-sm text-white/80">
              {t('promo.orderNow', 'ابھی آرڈر کریں اور بچت کریں')}
            </p>
          </div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </motion.div>
        </div>

        {/* Floating Emojis */}
        <motion.div
          animate={{ y: [-5, 5, -5] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute right-20 top-2 text-2xl"
        >
          🎉
        </motion.div>
      </motion.div>
    </section>
  );
};

export default PromoBanner;
