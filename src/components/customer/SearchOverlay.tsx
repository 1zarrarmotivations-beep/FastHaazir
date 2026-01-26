import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowLeft, Clock, Star, MapPin, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBusinesses } from '@/hooks/useBusinesses';
import { useMenuItems } from '@/hooks/useMenuItems';
import { supabase } from '@/integrations/supabase/client';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  business_id: string;
  image: string | null;
  category: string | null;
}

const trendingSearches = [
  'پیزا',
  'بریانی',
  'برگر',
  'کراہی',
  'چائے',
  'میٹھائی'
];

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [menuResults, setMenuResults] = useState<MenuItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Get all businesses for search
  const { data: restaurants = [] } = useBusinesses('restaurant');
  const { data: bakeries = [] } = useBusinesses('bakery');
  const { data: grocery = [] } = useBusinesses('grocery');

  const allBusinesses = useMemo(() => 
    [...restaurants, ...bakeries, ...grocery],
    [restaurants, bakeries, grocery]
  );

  // Search menu items when query changes
  useEffect(() => {
    const searchMenuItems = async () => {
      if (query.length < 2) {
        setMenuResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('id, name, price, business_id, image, category')
          .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
          .eq('is_available', true)
          .limit(10);

        if (!error && data) {
          setMenuResults(data);
        }
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchMenuItems, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  // Filter businesses based on query
  const filteredBusinesses = useMemo(() => {
    if (query.length < 2) return [];
    const lowerQuery = query.toLowerCase();
    return allBusinesses.filter(b => 
      b.name.toLowerCase().includes(lowerQuery) ||
      (b.category?.toLowerCase().includes(lowerQuery))
    ).slice(0, 5);
  }, [query, allBusinesses]);

  const handleBusinessClick = (id: string) => {
    onClose();
    navigate(`/restaurant/${id}`);
  };

  const handleMenuItemClick = (businessId: string) => {
    onClose();
    navigate(`/restaurant/${businessId}`);
  };

  const handleTrendingClick = (term: string) => {
    setQuery(term);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background"
        >
          <div className="mobile-container min-h-screen">
            {/* Search Header */}
            <header className="sticky top-0 z-10 bg-background border-b border-border/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={onClose}
                  className="shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('home.searchPlaceholder', 'پیزا، برگر، بریانی تلاش کریں...')}
                    className="w-full h-11 pl-11 pr-10 rounded-xl bg-muted/50 border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            </header>

            <div className="p-4">
              {/* Trending Searches - Show when no query */}
              {!query && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {t('search.trending', 'مقبول تلاش')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendingSearches.map((term) => (
                      <Badge
                        key={term}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => handleTrendingClick(term)}
                      >
                        {term}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Search Results */}
              {query.length >= 2 && (
                <div className="space-y-4">
                  {/* Business Results */}
                  {filteredBusinesses.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                        {t('search.restaurants', 'ریستوران')}
                      </h3>
                      <div className="space-y-2">
                        {filteredBusinesses.map((business, index) => (
                          <motion.div
                            key={business.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card
                              variant="elevated"
                              className="p-3 cursor-pointer hover:shadow-card transition-all"
                              onClick={() => handleBusinessClick(business.id)}
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={business.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100&h=100&fit=crop'}
                                  alt={business.name}
                                  className="w-14 h-14 rounded-xl object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm truncate">{business.name}</h4>
                                  <p className="text-xs text-muted-foreground">{business.category}</p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Star className="w-3 h-3 text-primary fill-primary" />
                                      {business.rating?.toFixed(1)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {business.eta}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Menu Item Results */}
                  {menuResults.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                        {t('search.menuItems', 'کھانے کی اشیاء')}
                      </h3>
                      <div className="space-y-2">
                        {menuResults.map((item, index) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card
                              variant="elevated"
                              className="p-3 cursor-pointer hover:shadow-card transition-all"
                              onClick={() => handleMenuItemClick(item.business_id)}
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100&h=100&fit=crop'}
                                  alt={item.name}
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm truncate">{item.name}</h4>
                                  <p className="text-xs text-muted-foreground">{item.category}</p>
                                </div>
                                <span className="text-sm font-bold text-primary">
                                  Rs. {item.price}
                                </span>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Results */}
                  {filteredBusinesses.length === 0 && menuResults.length === 0 && !isSearching && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-12"
                    >
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {t('search.noResults', 'کچھ نہیں ملا')}
                      </h3>
                      <p className="text-sm text-muted-foreground text-center">
                        {t('search.tryDifferent', 'کوئی اور لفظ آزمائیں')}
                      </p>
                    </motion.div>
                  )}

                  {/* Loading State */}
                  {isSearching && (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchOverlay;
