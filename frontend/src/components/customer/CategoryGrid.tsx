import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatCategoryName } from '@/lib/textFormatters';

interface Category {
  id: string;
  nameKey: string;
  emoji: string;
  path: string;
  gradient: string;
}

const categories: Category[] = [
  { id: 'pizza', nameKey: 'categories.pizza', emoji: '🍕', path: '/restaurants?category=pizza', gradient: 'from-red-500/20 to-orange-500/20' },
  { id: 'biryani', nameKey: 'categories.biryani', emoji: '🍛', path: '/restaurants?category=biryani', gradient: 'from-amber-500/20 to-yellow-500/20' },
  { id: 'burger', nameKey: 'categories.burger', emoji: '🍔', path: '/restaurants?category=burger', gradient: 'from-orange-500/20 to-red-500/20' },
  { id: 'grocery', nameKey: 'categories.grocery', emoji: '🛒', path: '/grocery', gradient: 'from-green-500/20 to-emerald-500/20' },
  { id: 'bakery', nameKey: 'categories.bakery', emoji: '🥖', path: '/bakery', gradient: 'from-amber-400/20 to-orange-400/20' },
  { id: 'medical', nameKey: 'categories.medical', emoji: '💊', path: '/restaurants?category=medical', gradient: 'from-blue-500/20 to-cyan-500/20' },
  { id: 'bbq', nameKey: 'categories.bbq', emoji: '🍖', path: '/restaurants?category=bbq', gradient: 'from-red-600/20 to-orange-500/20' },
  { id: 'sweets', nameKey: 'categories.sweets', emoji: '🍰', path: '/restaurants?category=sweets', gradient: 'from-pink-500/20 to-purple-500/20' },
];

const CategoryGrid: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-foreground">
          {t('home.categories', 'اقسام')} 🍽️
        </h2>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {categories.map((category, index) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(category.path)}
            className="flex flex-col items-center gap-2"
          >
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.gradient} customer-category-card flex items-center justify-center`}>
              <span className="text-2xl">{category.emoji}</span>
            </div>
            <span className="text-[10px] font-medium text-foreground text-center leading-tight">
              {formatCategoryName(t(category.nameKey, category.id))}
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;
