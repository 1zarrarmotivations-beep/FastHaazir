import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useActivePromoBanners, PromoBanner } from '@/hooks/usePromoBanners';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const BannerCarousel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: banners, isLoading } = useActivePromoBanners();
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const isUrdu = i18n.language === 'ur';

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      align: 'center',
      direction: isUrdu ? 'rtl' : 'ltr',
    },
    [Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: true })]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  // Handle click action
  const handleClick = (banner: PromoBanner) => {
    switch (banner.click_action) {
      case 'restaurants':
        navigate('/restaurants');
        break;
      case 'categories':
        navigate('/categories');
        break;
      case 'business':
        if (banner.business_id) {
          navigate(`/restaurant/${banner.business_id}`);
        }
        break;
      case 'external':
        if (banner.external_url) {
          window.open(banner.external_url, '_blank', 'noopener,noreferrer');
        }
        break;
      default:
        break;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <section className="px-4 py-2">
        <Skeleton className="h-32 w-full rounded-2xl" />
      </section>
    );
  }

  // No active banners
  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <section className="px-4 py-2">
      <div className="relative">
        {/* Carousel Container */}
        <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
          <div className="flex touch-pan-y">
            {banners.map((banner, index) => {
              const heading = isUrdu ? banner.heading_ur : banner.heading_en;
              const description = isUrdu 
                ? (banner.subtitle_ur || banner.description_ur) 
                : (banner.subtitle_en || banner.description_en);
              const buttonText = isUrdu ? banner.button_text_ur : banner.button_text_en;
              const isClickable = banner.click_action !== 'none';

              return (
                <motion.div
                  key={banner.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-[0_0_100%] min-w-0"
                >
                  <div
                    onClick={isClickable ? () => handleClick(banner) : undefined}
                    className={cn(
                      "relative overflow-hidden rounded-2xl p-5 mx-1",
                      isClickable && "cursor-pointer active:scale-[0.98] transition-transform"
                    )}
                    style={{
                      background: banner.background_type === 'gradient' 
                        ? banner.background_value 
                        : `url(${banner.background_value}) center/cover`,
                      boxShadow: '0 8px 32px -8px rgba(255, 106, 0, 0.25)',
                      minHeight: '120px',
                    }}
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

                    {/* Shimmer Effect */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                      }}
                      animate={{ x: ['-100%', '100%'] }}
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
                          <p className="text-sm text-white/80 leading-relaxed mb-2">
                            {description}
                          </p>
                        )}
                        
                        {/* CTA Button */}
                        {buttonText && isClickable && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 mt-1"
                          >
                            {buttonText}
                          </Button>
                        )}
                      </div>
                      
                      {isClickable && !buttonText && (
                        <motion.div
                          animate={{ 
                            x: isUrdu ? [-3, 3, -3] : [3, -3, 3],
                          }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm flex-shrink-0"
                        >
                          <ChevronRight 
                            className={cn("w-5 h-5 text-white", isUrdu && "rotate-180")} 
                          />
                        </motion.div>
                      )}
                    </div>

                    {/* Floating Emoji */}
                    {banner.icon && (
                      <motion.div
                        animate={{ y: [-5, 5, -5] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute top-3 text-2xl pointer-events-none"
                        style={{ [isUrdu ? 'left' : 'right']: '5rem' }}
                      >
                        {banner.icon}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Navigation Arrows (show only if multiple banners) */}
        {banners.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors z-10"
              aria-label="Previous banner"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors z-10"
              aria-label="Next banner"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {banners.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === selectedIndex 
                    ? "bg-primary w-6" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Go to banner ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BannerCarousel;
