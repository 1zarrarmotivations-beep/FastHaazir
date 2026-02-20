import React from 'react';
import { motion } from 'framer-motion';
import { Truck, Star, Clock, Flame, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const filters = [
    { id: 'fast', label: 'Fast Delivery', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'top', label: 'Top Rated', icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'trending', label: 'Trending', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'verified', label: 'Verified', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'free', label: 'Free Delivery', icon: Truck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
];

interface Props {
    active: string;
    onChange: (id: string) => void;
}

const ExploreChips: React.FC<Props> = ({ active, onChange }) => {
    return (
        <div className="mb-8 overflow-hidden">
            <div className="flex gap-3 overflow-x-auto px-6 pb-2 scrollbar-none">
                {filters.map((filter) => {
                    const Icon = filter.icon;
                    const isActive = active === filter.id;

                    return (
                        <motion.button
                            key={filter.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onChange(filter.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all border",
                                isActive
                                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                                    : "bg-card border-border text-muted-foreground"
                            )}
                        >
                            <Icon className={cn("w-4 h-4", isActive ? "text-white" : filter.color)} />
                            <span className="text-sm font-bold tracking-tight">{filter.label}</span>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

export default ExploreChips;
