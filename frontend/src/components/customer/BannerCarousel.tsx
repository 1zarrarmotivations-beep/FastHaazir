import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronLeft, Sparkles, Megaphone, Smartphone, ShoppingBag, ArrowRight } from 'lucide-react';
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
  const { data: banners, isLoading } = useActivePromoBanners('home');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isUrdu = i18n.language === 'ur';

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'center',
      direction: isUrdu ? 'rtl' : 'ltr',
    },
    [Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })]
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
    switch (banner.action_type) {
      case 'store':
        if (banner.action_value) navigate(`/restaurant/${banner.action_value}`);
        else navigate('/restaurants');
        break;
      case 'product':
        // Assuming product navigation, or just search
        navigate('/search?q=' + banner.title);
        break;
      case 'link':
      default:
        if (banner.action_value?.startsWith('http')) {
          window.open(banner.action_value, '_blank');
        } else if (banner.action_value) {
          navigate(banner.action_value);
        }
        break;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <section className="px-4 py-2">
        <Skeleton className="h-40 w-full rounded-2xl animate-pulse bg-muted" />
      </section>
    );
  }

  // No active banners
  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <section className="px-4 py-4">
      <div className="relative group">
        {/* Carousel Container */}
        <div className="overflow-hidden rounded-3xl shadow-xl shadow-primary/5 border border-primary/10" ref={emblaRef}>
          <div className="flex touch-pan-y">
            {banners.map((banner, index) => {
              const isClickable = !!banner.action_value;
              const hasGradient = banner.style_config?.gradient;
              const hasImage = !!banner.image_url;

              return (
                <motion.div
                  key={banner.id}
                  className="flex-[0_0_100%] min-w-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div
                    onClick={isClickable ? () => handleClick(banner) : undefined}
                    className={cn(
                      "relative overflow-hidden rounded-3xl aspect-[21/9] md:aspect-[3/1]",
                      isClickable && "cursor-pointer"
                    )}
                  >
                    {/* Background Layer */}
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                      style={{
                        backgroundImage: hasImage ? `url(${banner.image_url})` : 'none',
                        background: !hasImage && hasGradient ? hasGradient : undefined,
                        backgroundColor: !hasImage && !hasGradient ? '#f1f5f9' : undefined
                      }}
                    >
                      {/* Fallback pattern if no image */}
                      {!hasImage && !hasGradient && (
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-700 via-gray-900 to-black" />
                      )}
                    </div>

                    {/* Gradient Overlay for Readability */}
                    <div
                      className="absolute inset-0 bg-black transition-opacity duration-300 pointer-events-none"
                      style={{ opacity: banner.style_config?.overlayOpacity ?? 0.4 }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none opacity-80" />

                    {/* Content Layer */}
                    <div
                      className="absolute inset-0 p-6 md:p-10 flex flex-col justify-end"
                      style={{ direction: isUrdu ? 'rtl' : 'ltr' }}
                    >
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center gap-2 mb-2"
                      >
                        {banner.style_config?.icon && (
                          <span className="text-2xl drop-shadow-md">
                            {/* Simple icon mapping or just show if valid emoji/component */}
                            {banner.style_config.icon === 'Megaphone' && <Megaphone className="w-5 h-5 text-primary" />}
                            {banner.style_config.icon === 'Smartphone' && <Smartphone className="w-5 h-5 text-primary" />}
                            {banner.style_config.icon === 'ShoppingBag' && <ShoppingBag className="w-5 h-5 text-primary" />}
                          </span>
                        )}
                        {/* Optional Badge */}
                        {/* <span className="bg-primary/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-md">
                             Featured
                         </span> */}
                      </motion.div>

                      <motion.h3
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-2xl md:text-4xl font-black text-white mb-2 leading-tight drop-shadow-lg max-w-[90%]"
                        style={{ color: banner.style_config?.textColor }}
                      >
                        {banner.title}
                      </motion.h3>

                      {banner.subtitle && (
                        <motion.p
                          initial={{ y: 20, opacity: 0 }}
                          whileInView={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="text-sm md:text-lg text-white/90 font-medium mb-4 max-w-[80%] drop-shadow-md line-clamp-2"
                          style={{ color: banner.style_config?.textColor ? banner.style_config.textColor + 'EE' : undefined }}
                        >
                          {banner.subtitle}
                        </motion.p>
                      )}

                      {/* CTA Indicator */}
                      {isClickable && (
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          whileInView={{ width: 'auto', opacity: 1 }}
                          transition={{ delay: 0.4 }}
                        >
                          <Button
                            size="sm"
                            className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border-0 gap-2 rounded-full pl-4 pr-3 h-8 text-xs font-bold transition-all active:scale-95"
                          >
                            {t('common.viewDetails', 'View Details')}
                            <div className="bg-white text-black rounded-full p-1 w-5 h-5 flex items-center justify-center">
                              <ArrowRight className={cn("w-3 h-3", isUrdu && "rotate-180")} />
                            </div>
                          </Button>
                        </motion.div>
                      )}
                    </div>
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
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-all z-10 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0"
              aria-label="Previous banner"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-all z-10 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
              aria-label="Next banner"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 right-6 flex gap-1.5 z-20">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 backdrop-blur-sm",
                  index === selectedIndex
                    ? "bg-white w-6"
                    : "bg-white/40 w-1.5 hover:bg-white/60"
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
