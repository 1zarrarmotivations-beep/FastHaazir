import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Tag } from 'lucide-react';
import { ExploreOffer } from '@/hooks/useExploreData';
import { toast } from 'sonner';

interface Props {
    offers: ExploreOffer[];
}

const ExploreOffers: React.FC<Props> = ({ offers }) => {
    const handleClaim = (offerTitle: string) => {
        toast.success(`Coupon for "${offerTitle}" claimed!`, {
            description: "Discount will be applied automatically at checkout.",
            icon: <Sparkles className="w-4 h-4 text-primary" />
        });
    };

    if (offers.length === 0) return null;

    return (
        <div className="px-6 mb-12">
            <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-foreground tracking-tight">Best Deals for You</h3>
                    <p className="text-xs text-muted-foreground font-medium">Handpicked flash offers</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {offers.map((offer) => (
                    <motion.div
                        key={offer.id}
                        whileHover={{ y: -5 }}
                        className="group relative overflow-hidden rounded-[2.5rem] bg-card border border-border/50 p-6 shadow-xl shadow-primary/5"
                    >
                        <div className="relative h-40 overflow-hidden">
                            {offer.image_url || offer.store?.image ? (
                                <img
                                    src={offer.image_url || offer.store?.image || `https://placehold.co/600x400/orange/white?text=${encodeURIComponent(offer.title)}`}
                                    alt={offer.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center`}>
                                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <Tag className="w-8 h-8 text-primary" />
                                    </div>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                            <div className="absolute top-4 left-4">
                                <span className="bg-white/90 backdrop-blur-md text-primary text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm flex items-center gap-1">
                                    <Tag className="w-3 h-3" />
                                    {offer.store?.name || 'Limited Offer'}
                                </span>
                            </div>

                            <div className="absolute bottom-4 right-4 flex flex-col items-end text-white">
                                <span className="text-3xl font-black leading-none dropshadow-md">
                                    {offer.discount_value}{offer.discount_type === 'percent' ? '%' : ''}
                                </span>
                                <span className="text-xs font-bold uppercase opacity-90 tracking-widest">{offer.discount_type === 'percent' ? 'OFF' : 'DISCOUNT'}</span>
                            </div>
                        </div>

                        <div className="p-5 relative z-10 bg-card">
                            <h4 className="text-lg font-black leading-tight group-hover:text-primary transition-colors mb-2 line-clamp-1">
                                {offer.title}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-4 font-medium">
                                {offer.description || `Get ${offer.discount_value}% off on your order from ${offer.store?.name}. Limited time offer!`}
                            </p>

                            <div className="flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="w-6 h-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[8px] font-bold overflow-hidden">
                                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="User" />
                                        </div>
                                    ))}
                                    <div className="w-6 h-6 rounded-full border-2 border-card bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold">
                                        +12
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-medium ml-3 self-center">claimed this</span>
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleClaim(offer.title)}
                                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
                                >
                                    Claim
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ExploreOffers;
