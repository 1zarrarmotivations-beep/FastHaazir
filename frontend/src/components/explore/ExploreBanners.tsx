import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExploreBanner {
    id: string;
    title: string;
    subtitle: string;
    image_url?: string;
    gradient?: string;
    icon?: string;
    redirect_type: string;
    redirect_id: string;
}

interface Props {
    banners: ExploreBanner[];
}

const ExploreBanners: React.FC<Props> = ({ banners }) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (banners.length <= 1) return;
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [banners.length]);

    if (banners.length === 0) return (
        <div className="px-6 mb-8">
            <div className="w-full aspect-[21/9] rounded-3xl bg-muted animate-pulse" />
        </div>
    );

    const banner = banners[index];

    return (
        <div className="px-6 mb-8 relative">
            <div className="w-full aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={banner.id}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.7 }}
                        className="absolute inset-0"
                        style={{
                            background: banner.gradient || 'none',
                            backgroundColor: banner.gradient ? 'transparent' : '#f1f5f9'
                        }}
                    >
                        {banner.image_url && (
                            <img
                                src={banner.image_url}
                                alt={banner.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.src = `https://placehold.co/800x400/10b981/white?text=${encodeURIComponent(banner.title)}`;
                                }}
                            />
                        )}

                        {/* Gloss Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                        <div className="absolute inset-0 p-6 flex flex-col justify-end">
                            <div className="flex items-center gap-3 mb-2">
                                {banner.icon && <span className="text-2xl drop-shadow-md">{banner.icon}</span>}
                                <motion.h2
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-2xl font-black text-white leading-none drop-shadow-lg"
                                >
                                    {banner.title}
                                </motion.h2>
                            </div>
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-sm text-white/80 font-medium drop-shadow-md max-w-[80%]"
                            >
                                {banner.subtitle}
                            </motion.p>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Indicators */}
                <div className="absolute top-6 right-6 flex gap-1.5">
                    {banners.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ExploreBanners;
