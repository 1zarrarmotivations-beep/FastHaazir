import React from 'react';
import { motion } from 'framer-motion';
import { Tag, Sparkles } from 'lucide-react';

const ExploreOffers: React.FC<{ offers: any[] }> = ({ offers }) => {
    if (offers.length === 0) return null;

    return (
        <div className="px-6 mb-10">
            <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-5 h-5 text-amber-500 fill-current" />
                <h3 className="text-xl font-black text-foreground tracking-tight">Best Deals for You</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {offers.map((offer, index) => (
                    <motion.div
                        key={offer.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative overflow-hidden rounded-3xl bg-slate-950 p-4 border border-white/10"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10" />
                        <div className="relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white mb-3 shadow-lg shadow-primary/30">
                                <Tag className="w-5 h-5 fill-current" />
                            </div>
                            <h4 className="text-white font-black text-lg leading-tight mb-1">{offer.title}</h4>
                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-4">{offer.store?.name || 'Limited Offer'}</p>

                            <div className="flex items-end justify-between">
                                <div>
                                    <span className="text-2xl font-black text-white">{offer.discount_value}{offer.discount_type === 'percent' ? '%' : ' OFF'}</span>
                                </div>
                                <button className="bg-white text-black px-3 py-1 rounded-full text-[10px] font-black uppercase">Claim</button>
                            </div>
                        </div>

                        {/* Gloss */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ExploreOffers;
