import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Minus, ShoppingCart, Star, Flame, Zap } from "lucide-react";
import { useGroceryCart, GroceryProduct, GroceryVariant } from "@/context/GroceryCartContext";
import { useGroceryProductVariants, useProductRatingSummary } from "@/hooks/useGroceryAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ProductCardProps {
    product: any;
    onProductClick?: (product: any) => void;
}

export default function ProductCard({ product, onProductClick }: ProductCardProps) {
    const { t } = useTranslation();
    const { items, addItem, updateQuantity } = useGroceryCart();
    const { data: variants } = useGroceryProductVariants(product.id);
    const { data: ratingSummary } = useProductRatingSummary(product.id);

    const [showVariantDialog, setShowVariantDialog] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState<GroceryVariant | null>(null);
    const [quantity, setQuantity] = useState(product.min_quantity || 1);
    const [isAdding, setIsAdding] = useState(false);

    const currentItem = items.find(i => i.id === product.id || i.id === `${product.id}-${selectedVariant?.id}`);
    const currentQuantity = currentItem?.quantity || 0;

    const hasVariants = variants && variants.length > 0;
    const currentPrice = selectedVariant?.discount_price || selectedVariant?.price || product.discount_price || product.base_price;
    const originalPrice = selectedVariant?.price || product.base_price;
    const discount = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

    const isOutOfStock = product.stock_quantity <= 0 || (selectedVariant && selectedVariant.stock_quantity <= 0);
    const isLowStock = !isOutOfStock && product.stock_quantity <= product.low_stock_threshold;

    const handleAddToCart = () => {
        if (hasVariants && !selectedVariant) {
            setShowVariantDialog(true);
            return;
        }

        setIsAdding(true);
        addItem(product, quantity, selectedVariant || undefined);
        setTimeout(() => {
            setIsAdding(false);
            setShowVariantDialog(false);
            setQuantity(product.min_quantity || 1);
            setSelectedVariant(null);
        }, 500);
    };

    const handleQuickAdd = () => {
        if (hasVariants) {
            setShowVariantDialog(true);
        } else {
            addItem(product, 1);
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-white dark:bg-muted/20 rounded-[1.5rem] overflow-hidden border border-border/30 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer"
                onClick={() => onProductClick?.(product)}
            >
                {/* Image Section */}
                <div className="relative aspect-square overflow-hidden bg-muted/30">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">
                            {product.category?.name?.toLowerCase().includes('fruit') ? '🍎' :
                                product.category?.name?.toLowerCase().includes('vegetable') ? '🥦' :
                                    product.category?.name?.toLowerCase().includes('meat') ? '🥩' :
                                        product.category?.name?.toLowerCase().includes('dairy') ? '🥛' :
                                            product.category?.name?.toLowerCase().includes('bakery') ? '🥐' :
                                                '📦'}
                        </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {product.is_trending && (
                            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg">
                                <Flame size={10} className="mr-1" />
                                TRENDING
                            </Badge>
                        )}
                        {product.is_featured && (
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg">
                                <Star size={10} className="mr-1" />
                                FEATURED
                            </Badge>
                        )}
                        {discount > 0 && (
                            <Badge className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg">
                                {discount}% OFF
                            </Badge>
                        )}
                    </div>

                    {/* Low Stock / Out of Stock */}
                    {isOutOfStock ? (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Badge variant="destructive" className="font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-full">
                                {t('grocery.outOfStock')}
                            </Badge>
                        </div>
                    ) : isLowStock && (
                        <div className="absolute top-2 right-2 bg-amber-500/90 backdrop-blur-md text-white text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest shadow-lg animate-pulse">
                            Only {product.stock_quantity} left
                        </div>
                    )}

                    {/* Rating Badge */}
                    {ratingSummary && ratingSummary.total_reviews > 0 && (
                        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1">
                            <Star size={10} className="text-amber-400 fill-amber-400" />
                            {ratingSummary.average_rating?.toFixed(1)}
                            <span className="text-white/60">({ratingSummary.total_reviews})</span>
                        </div>
                    )}

                    {/* Quick Add Button */}
                    {!isOutOfStock && (
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAdd();
                            }}
                            className="absolute bottom-2 right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300"
                        >
                            <Plus size={20} className="text-white" />
                        </motion.button>
                    )}
                </div>

                {/* Content Section */}
                <div className="p-3 space-y-2">
                    <h3 className="font-black text-sm line-clamp-2 leading-tight">{product.name}</h3>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-primary">PKR {currentPrice}</span>
                        {discount > 0 && (
                            <span className="text-xs text-muted-foreground line-through">PKR {originalPrice}</span>
                        )}
                    </div>

                    {/* Variant Info */}
                    {hasVariants && (
                        <p className="text-[10px] text-muted-foreground font-medium">
                            Multiple variants available
                        </p>
                    )}

                    {/* Quantity Controls (if in cart) */}
                    {currentQuantity > 0 && (
                        <div className="flex items-center justify-between bg-primary/10 rounded-full p-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (currentQuantity > (product.min_quantity || 1)) {
                                        updateQuantity(currentItem!.id, currentQuantity - 1);
                                    }
                                }}
                                className="w-8 h-8 rounded-full bg-white dark:bg-muted flex items-center justify-center shadow-sm"
                            >
                                <Minus size={14} className="text-primary" />
                            </button>
                            <span className="font-black text-sm">{currentQuantity}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (currentQuantity < (product.max_quantity || 100)) {
                                        updateQuantity(currentItem!.id, currentQuantity + 1);
                                    }
                                }}
                                className="w-8 h-8 rounded-full bg-white dark:bg-muted flex items-center justify-center shadow-sm"
                            >
                                <Plus size={14} className="text-primary" />
                            </button>
                        </div>
                    )}

                    {/* Add to Cart Button (if not in cart) */}
                    {currentQuantity === 0 && !isOutOfStock && (
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAdd();
                            }}
                            className="w-full h-9 rounded-full font-black text-xs uppercase tracking-wider bg-primary hover:bg-primary/90"
                        >
                            <ShoppingCart size={14} className="mr-2" />
                            {t('grocery.addToCart')}
                        </Button>
                    )}
                </div>

                {/* Flash Sale Indicator */}
                {product.flash_sale && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[8px] font-black px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
                        <Zap size={10} />
                        FLASH SALE
                    </div>
                )}
            </motion.div>

            {/* Variant Selection Dialog */}
            <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black text-lg">Select Variant</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground font-medium">
                            Choose your preferred size/weight for {product.name}
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            {variants?.map((variant: GroceryVariant) => (
                                <button
                                    key={variant.id}
                                    onClick={() => setSelectedVariant(variant)}
                                    className={`p-3 rounded-xl border-2 transition-all ${selectedVariant?.id === variant.id
                                            ? 'border-primary bg-primary/10'
                                            : 'border-border hover:border-primary/50'
                                        }`}
                                >
                                    <p className="font-black text-sm">{variant.variant_name}</p>
                                    <div className="flex items-baseline gap-1 mt-1">
                                        <span className="text-primary font-black">
                                            PKR {variant.discount_price || variant.price}
                                        </span>
                                        {variant.discount_price && variant.discount_price < variant.price && (
                                            <span className="text-xs text-muted-foreground line-through">
                                                PKR {variant.price}
                                            </span>
                                        )}
                                    </div>
                                    {variant.stock_quantity <= 5 && variant.stock_quantity > 0 && (
                                        <p className="text-[10px] text-amber-600 font-medium mt-1">
                                            Only {variant.stock_quantity} left
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Quantity Selector */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                            <span className="font-medium">Quantity</span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="w-8 h-8 rounded-full bg-white dark:bg-muted flex items-center justify-center shadow-sm"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="font-black text-lg w-8 text-center">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(Math.min(product.max_quantity || 100, quantity + 1))}
                                    className="w-8 h-8 rounded-full bg-white dark:bg-muted flex items-center justify-center shadow-sm"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>

                        <Button
                            onClick={handleAddToCart}
                            disabled={!selectedVariant || isAdding}
                            className="w-full h-12 rounded-full font-black text-sm"
                        >
                            {isAdding ? (
                                "Adding..."
                            ) : (
                                <>
                                    <ShoppingCart size={18} className="mr-2" />
                                    Add to Cart - PKR {currentPrice * quantity}
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
