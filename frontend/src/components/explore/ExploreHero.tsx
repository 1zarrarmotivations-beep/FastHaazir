import React from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

const ExploreHero: React.FC = () => {
    const { user } = useAuth();
    const { t } = useTranslation();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('common.goodMorning', 'Good Morning');
        if (hour < 18) return t('common.goodAfternoon', 'Good Afternoon');
        return t('common.goodEvening', 'Good Evening');
    };

    const username = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Guest';

    return (
        <div className="pt-6 px-6 pb-4">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <span className="text-2xl">👋</span>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-sm font-medium">{getGreeting()}</p>
                        <h1 className="text-xl font-bold tracking-tight text-foreground">{username}</h1>
                    </div>
                </div>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    className="w-10 h-10 rounded-full bg-muted flex items-center justify-center relative shadow-sm"
                >
                    <Bell className="w-5 h-5 text-foreground" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background" />
                </motion.button>
            </div>

            <div className="flex items-center gap-2 mb-6 bg-muted/50 p-2 rounded-2xl border border-border/50">
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Delivering to</p>
                    <p className="text-sm font-semibold text-foreground truncate">Quetta, Pakistan</p>
                </div>
            </div>

            <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                    type="text"
                    placeholder={t('home.searchPlaceholder', 'Explore restaurants, food, and more...')}
                    className="w-full h-14 pl-12 pr-4 bg-muted/80 backdrop-blur-md rounded-2xl border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                />
                <div className="absolute inset-y-0 right-4 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-brand">
                        <Search className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExploreHero;
