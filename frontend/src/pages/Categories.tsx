import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import BottomNav from '@/components/BottomNav';
import { useExploreData } from '@/hooks/useExploreData';
import ExploreHero from '@/components/explore/ExploreHero';
import ExploreBanners from '@/components/explore/ExploreBanners';
import ExploreChips from '@/components/explore/ExploreChips';
import ExploreCategories from '@/components/explore/ExploreCategories';
import ExploreTrending from '@/components/explore/ExploreTrending';
import ExploreOffers from '@/components/explore/ExploreOffers';

const ExploreSkeleton = () => (
  <div className="p-6 space-y-8 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-muted" />
      <div className="space-y-2">
        <div className="w-24 h-4 rounded bg-muted" />
        <div className="w-32 h-6 rounded bg-muted" />
      </div>
    </div>
    <div className="w-full h-14 rounded-2xl bg-muted" />
    <div className="w-full aspect-[21/9] rounded-3xl bg-muted" />
    <div className="flex gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="w-24 h-10 rounded-2xl bg-muted" />)}
    </div>
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="w-full aspect-square rounded-2xl bg-muted" />
          <div className="w-12 h-3 rounded bg-muted" />
        </div>
      ))}
    </div>
  </div>
);

const Categories: React.FC = () => {
  const { t } = useTranslation();
  const { banners, categories, trending, offers, isLoading, refetch } = useExploreData();

  if (isLoading && categories.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <ExploreSkeleton />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Scrollable Container with pull-to-refresh hint (UI only for now) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative"
      >
        <ExploreHero />

        <ExploreBanners banners={banners} />

        <ExploreChips />

        <ExploreCategories categories={categories} />

        <ExploreTrending trending={trending} />

        <ExploreOffers offers={offers} />

        {/* Personalized Recommendations Placeholder */}
        <div className="px-6 mb-10">
          <div className="bg-primary/5 border border-primary/10 rounded-[32px] p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <h3 className="text-xl font-black text-foreground mb-1">Recommended for You</h3>
            <p className="text-sm text-muted-foreground font-medium mb-4">Based on your recent orders</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 bg-background/50 rounded-2xl border border-border flex items-center justify-center">
                <span className="text-xs font-bold text-muted-foreground">More coming soon...</span>
              </div>
              <div className="h-20 bg-background/50 rounded-2xl border border-border flex items-center justify-center opacity-50 italic">
                <span className="text-xs">Learning your taste...</span>
              </div>
            </div>
          </div>
        </div>

      </motion.div>

      <BottomNav />
    </div>
  );
};

export default Categories;

