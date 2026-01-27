import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { formatCategoryName } from '@/lib/textFormatters';
import BottomNav from '@/components/BottomNav';

interface Category {
  id: string;
  nameKey: string;
  emoji: string;
  gradient: string;
}

const allCategories: Category[] = [
  { id: 'pizza', nameKey: 'categories.pizza', emoji: '🍕', gradient: 'from-red-500/20 to-orange-500/20' },
  { id: 'biryani', nameKey: 'categories.biryani', emoji: '🍛', gradient: 'from-amber-500/20 to-yellow-500/20' },
  { id: 'burger', nameKey: 'categories.burger', emoji: '🍔', gradient: 'from-orange-500/20 to-red-500/20' },
  { id: 'chinese', nameKey: 'categories.chinese', emoji: '🥡', gradient: 'from-rose-500/20 to-pink-500/20' },
  { id: 'karahi', nameKey: 'categories.karahi', emoji: '🍲', gradient: 'from-orange-600/20 to-amber-500/20' },
  { id: 'bbq', nameKey: 'categories.bbq', emoji: '🍖', gradient: 'from-red-600/20 to-orange-500/20' },
  { id: 'chai', nameKey: 'categories.chai', emoji: '☕', gradient: 'from-amber-600/20 to-yellow-500/20' },
  { id: 'sweets', nameKey: 'categories.sweets', emoji: '🍰', gradient: 'from-pink-500/20 to-purple-500/20' },
  { id: 'shawarma', nameKey: 'categories.shawarma', emoji: '🌯', gradient: 'from-yellow-500/20 to-orange-500/20' },
  { id: 'tikka', nameKey: 'categories.tikka', emoji: '🍢', gradient: 'from-red-500/20 to-amber-500/20' },
  { id: 'paratha', nameKey: 'categories.paratha', emoji: '🫓', gradient: 'from-amber-500/20 to-orange-500/20' },
  { id: 'sandwich', nameKey: 'categories.sandwich', emoji: '🥪', gradient: 'from-green-500/20 to-yellow-500/20' },
  { id: 'pasta', nameKey: 'categories.pasta', emoji: '🍝', gradient: 'from-yellow-500/20 to-red-500/20' },
  { id: 'seafood', nameKey: 'categories.seafood', emoji: '🦐', gradient: 'from-blue-500/20 to-cyan-500/20' },
  { id: 'drinks', nameKey: 'categories.drinks', emoji: '🥤', gradient: 'from-cyan-500/20 to-blue-500/20' },
  { id: 'breakfast', nameKey: 'categories.breakfast', emoji: '🍳', gradient: 'from-yellow-400/20 to-orange-400/20' },
];

const Categories: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/restaurants?category=${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>
          <h1 className="text-lg font-bold text-foreground">
            {t('home.allCategories', 'تمام اقسام')} 🍽️
          </h1>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-4">
          {allCategories.map((category, index) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCategoryClick(category.id)}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${category.gradient} flex items-center justify-center`}>
                <span className="text-3xl">{category.emoji}</span>
              </div>
              <span className="text-xs font-medium text-foreground text-center leading-tight">
                {formatCategoryName(t(category.nameKey, category.id))}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Categories;
