
import { motion } from "framer-motion";
import { ArrowLeft, Search, Filter, Croissant } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import BusinessCard from "@/components/BusinessCard";
import BottomNav from "@/components/BottomNav";
import { useBusinesses } from "@/hooks/useBusinesses";
import { useTranslation } from "react-i18next";

const Bakery = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const { data: bakeries, isLoading } = useBusinesses('bakery');

    const filteredStores = bakeries?.filter(store =>
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="mobile-container bg-background min-h-screen pb-24">
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border"
            >
                <div className="flex items-center gap-3 px-4 py-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="font-bold text-foreground text-lg">
                            {t('home.bakery', 'بیکری')}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {t('menu.freshBaked', 'تازہ بیکری آئٹمز')}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon">
                        <Filter className="w-5 h-5" />
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder={t('search.placeholder', 'سرچ کریں...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-muted border-0"
                        />
                    </div>
                </div>
            </motion.header>

            {/* Content */}
            <div className="p-4 space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredStores && filteredStores.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                        {filteredStores.map((store, index) => (
                            <motion.div
                                key={store.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <BusinessCard
                                    id={store.id}
                                    name={store.name}
                                    image={store.image || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'}
                                    rating={store.rating || 4.5}
                                    eta={store.eta || '20-30 min'}
                                    distance={store.distance || '1.0 km'}
                                    category={store.category || 'Bakery'}
                                    featured={store.featured}
                                    onClick={() => navigate(`/restaurant/${store.id}`)}
                                />
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-20">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="m2 11 1.83-2.17A4 4 0 0 1 6.86 7.5h10.28a4 4 0 0 1 3.03 1.33L22 11"></path><path d="M2 13h20"></path><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"></path><path d="M12 17v4"></path></svg>
                        </div>
                        <h3 className="font-semibold text-lg">No bakeries found</h3>
                        <p className="text-muted-foreground text-sm mt-1">
                            {searchQuery ? "Try a different search term" : "No bakeries available"}
                        </p>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default Bakery;
