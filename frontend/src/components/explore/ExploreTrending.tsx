import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, Heart } from 'lucide-react';
import { ExploreStore } from '@/hooks/useExploreData';

interface Props {
    trending: ExploreStore[];
}

const ExploreTrending: React.FC<Props> = ({ trending }) => {
    const navigate = useNavigate();

    return (
        <div className="mb-10">
            <div className="px-6 flex items-center justify-between mb-5">
                <h3 className="text-xl font-black text-foreground tracking-tight">Trending Near You</h3>
                <div className="flex gap-1.5 items-center bg-orange-500/10 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    Live Now
                </div>
            </div>

            {trending.length === 0 ? (
                <div className="px-6 text-center py-10 bg-muted/30 rounded-3xl mx-6 border-2 border-dashed border-muted">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                        <Clock className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground">No trending stores yet</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">Check back later for popular spots</p>
                </div>
            ) : (
                <div className="flex gap-5 overflow-x-auto px-6 pb-6 scrollbar-none">
                    {trending.map((store, index) => (
                        <motion.div
                            key={store.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -6 }}
                            className="flex-shrink-0 w-72 bg-card rounded-[32px] overflow-hidden border border-border shadow-md hover:shadow-xl transition-all group"
                            onClick={() => navigate(`/restaurant/${store.id}`)}
                        >
                            <div className="relative h-44 overflow-hidden">
                                <img
                                    src={store.image || `https://placehold.co/600x400/orange/white?text=${encodeURIComponent(store.name || store.type)}`}
                                    alt={store.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                                <div className="absolute top-4 left-4 flex gap-2">
                                    {store.is_featured && (
                                        <span className="bg-primary text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg uppercase tracking-wider">
                                            Featured
                                        </span>
                                    )}
                                    <span className="bg-white/90 backdrop-blur-md text-black text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                        {store.type}
                                    </span>
                                </div>

                                <button
                                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/40 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); }}
                                >
                                    <Heart className="w-4 h-4 text-white" />
                                </button>

                                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                    <div className="bg-emerald-500/90 backdrop-blur-md text-white px-2 py-0.5 rounded-lg flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-current" />
                                        <span className="text-xs font-black">{store.rating || '4.5'}</span>
                                    </div>
                                    <div className="bg-black/50 backdrop-blur-md text-white px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold text-[10px]">
                                        <Clock className="w-3 h-3" />
                                        {store.delivery_time_mins || '25-35'} Min
                                    </div>
                                </div>
                            </div>

                            <div className="p-5">
                                <h4 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors truncate">
                                    {store.name}
                                </h4>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        $ • Bakery • Grocery
                                    </p>
                                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                                        {store.total_orders > 100 ? 'Popular Choice' : 'New on FastHaazir'}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ExploreTrending;
