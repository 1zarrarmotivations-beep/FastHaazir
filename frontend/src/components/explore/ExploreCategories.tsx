import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ExploreCategory } from '@/hooks/useExploreData';

interface Props {
    categories: ExploreCategory[];
}

const ExploreCategories: React.FC<Props> = ({ categories }) => {
    const navigate = useNavigate();

    return (
        <div className="px-6 mb-10">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-black text-foreground tracking-tight">Top Categories</h3>
                <button
                    onClick={() => navigate('/categories')}
                    className="text-primary text-sm font-bold bg-primary/10 px-4 py-1.5 rounded-full"
                >
                    See All
                </button>
            </div>

            {categories.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
                    <p className="text-sm font-bold text-muted-foreground">No categories found</p>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-4">
                    {categories.map((category, index) => (
                        <motion.button
                            key={category.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ y: -5 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate(`/restaurants?category=${category.slug || category.id}`)}
                            className="flex flex-col items-center group"
                        >
                            <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-2 shadow-sm border border-border group-hover:border-primary/50 transition-colors">
                                <img
                                    src={category.image_url || `https://placehold.co/400x400/orange/white?text=${encodeURIComponent(category.name)}`}
                                    alt={category.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-115"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground text-center line-clamp-1 uppercase tracking-wider">
                                {category.name}
                            </span>
                        </motion.button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ExploreCategories;
