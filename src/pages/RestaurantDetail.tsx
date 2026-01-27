import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Clock, MapPin, Plus, Minus, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/context/CartContext';
import FloatingCart from '@/components/FloatingCart';
import { useBusiness } from '@/hooks/useBusinesses';
import { useMenuItems } from '@/hooks/useMenuItems';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCategoryName, formatItemName, formatPrice } from '@/lib/textFormatters';

const RestaurantDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addItem, items, updateQuantity } = useCart();

  const { data: business, isLoading: loadingBusiness } = useBusiness(id || '');
  const { data: menuCategories, isLoading: loadingMenu } = useMenuItems(id || '');

  const getItemQuantity = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    return item?.quantity || 0;
  };

  const handleAddItem = (item: any) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image || '',
      businessName: business?.name || '',
      businessId: business?.id || '',
    });
  };

  if (loadingBusiness) {
    return (
      <div className="mobile-container bg-background min-h-screen">
        <Skeleton className="h-56 w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="mobile-container bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Business not found</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-background min-h-screen pb-32">
      {/* Hero Image */}
      <div className="relative h-56">
        <img 
          src={business.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=400&fit=crop'} 
          alt={business.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <Button 
          variant="glass" 
          size="icon-sm" 
          className="absolute top-4 left-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Restaurant Info */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 -mt-8 relative z-10"
      >
        <Card variant="elevated" className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-foreground">{business.name}</h1>
              <p className="text-sm text-muted-foreground">{business.category}</p>
            </div>
            <Badge variant="default" className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              {Number(business.rating).toFixed(1)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{business.description}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{business.eta}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{business.distance}</span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Menu */}
      <div className="px-4 py-4 space-y-6">
        {loadingMenu ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : menuCategories && menuCategories.length > 0 ? (
          menuCategories.map((category, catIndex) => (
            <motion.section 
              key={category.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIndex * 0.1 }}
            >
              <h2 className="font-bold text-lg mb-3">{formatCategoryName(category.category)}</h2>
              <div className="space-y-3">
                {category.items.map((item, itemIndex) => {
                  const quantity = getItemQuantity(item.id);
                  
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (catIndex * 0.1) + (itemIndex * 0.05) }}
                    >
                      <Card variant="elevated" className="p-3">
                        <div className="flex gap-3">
                          <img 
                            src={item.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop'} 
                            alt={item.name}
                            className="w-20 h-20 rounded-xl object-cover"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-sm">{formatItemName(item.name)}</h3>
                                  {item.is_popular && (
                                    <Badge variant="success" className="text-[10px] px-2 py-0.5">
                                      Popular
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-primary font-bold mt-1">
                                  {formatPrice(item.price)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-end mt-2">
                              {quantity === 0 ? (
                                <Button 
                                  size="sm" 
                                  className="h-8"
                                  onClick={() => handleAddItem(item)}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add
                                </Button>
                              ) : (
                                <div className="flex items-center gap-3 bg-muted rounded-xl p-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon-sm"
                                    className="h-7 w-7"
                                    onClick={() => updateQuantity(item.id, quantity - 1)}
                                  >
                                    <Minus className="w-4 h-4" />
                                  </Button>
                                  <span className="font-bold w-4 text-center">{quantity}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon-sm"
                                    className="h-7 w-7"
                                    onClick={() => updateQuantity(item.id, quantity + 1)}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No menu items available</p>
          </div>
        )}
      </div>

      <FloatingCart />
    </div>
  );
};

export default RestaurantDetail;
