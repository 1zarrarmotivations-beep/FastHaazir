import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BusinessCard from './BusinessCard';

interface Business {
  id: string;
  name: string;
  image: string;
  rating: number;
  eta: string;
  distance: string;
  category: string;
  featured?: boolean;
}

interface HorizontalScrollSectionProps {
  title: string;
  subtitle?: string;
  businesses: Business[];
  onViewAll?: () => void;
  onBusinessClick?: (id: string) => void;
  priorityFirstImage?: boolean;
}

const HorizontalScrollSection = forwardRef<HTMLElement, HorizontalScrollSectionProps>(({
  title,
  subtitle,
  businesses,
  onViewAll,
  onBusinessClick,
  priorityFirstImage
}, ref) => {
  const { t } = useTranslation();

  return (
    <section ref={ref} className="py-4">
      <motion.div 
        initial={{ opacity: 0, x: -20 }} 
        animate={{ opacity: 1, x: 0 }} 
        className="flex items-center justify-between px-4 mb-3"
      >
        <div>
          <h2 className="text-lg font-bold text-primary">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <button 
          onClick={onViewAll} 
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors ltr-keep"
        >
          {t('common.viewAll')}
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>
      
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {businesses.map((business, index) => (
          <motion.div 
            key={business.id} 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: priorityFirstImage && index < 2 ? 0 : index * 0.1 }}
          >
            <BusinessCard 
              {...business} 
              priority={priorityFirstImage && index < 2} 
              onClick={() => onBusinessClick?.(business.id)} 
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
});

HorizontalScrollSection.displayName = 'HorizontalScrollSection';

export default HorizontalScrollSection;