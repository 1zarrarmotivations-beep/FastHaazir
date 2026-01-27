import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivePromoBanners, PromoBanner } from '@/hooks/usePromoBanners';

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
                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                      />
                    </div>

                    {/* Content */}
                    <div className={cn(
                      "relative z-10 flex flex-col justify-center h-full",
                      isUrdu && "text-right"
                    )}>
                      {/* Icon */}
                      {banner.icon && (
                        <motion.span 
                          className="text-3xl mb-2"
                          animate={{ 
                            rotate: [0, 5, -5, 0],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          {banner.icon}
                        </motion.span>
                      )}
                      
                      {/* Heading */}
                      <h3 
                        className={cn(
                          "font-bold text-white text-lg leading-tight mb-1",
                          isUrdu && "font-urdu"
                        )}
                      >
                        {heading}
                      </h3>
                      
                      {/* Description */}
                      {description && (
                        <p 
                          className={cn(
                            "text-white/90 text-sm mb-2",
                            isUrdu && "font-urdu"
                          )}
                        >
                          {description}
                        </p>
                      )}

                      {/* Button */}
                      {buttonText && isClickable && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-4 py-2 rounded-full w-fit border border-white/30"
                        >
                          {buttonText}
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Navigation Arrows - Only show if more than 1 banner */}
        {banners.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow-lg hover:bg-white transition-colors"
              aria-label="Previous banner"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow-lg hover:bg-white transition-colors"
              aria-label="Next banner"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </>
        )}

        {/* Dot Indicators - Only show if more than 1 banner */}
        {banners.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={cn(
                  "transition-all duration-300 rounded-full",
                  selectedIndex === index 
                    ? "w-6 h-2 bg-primary" 
                    : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
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
