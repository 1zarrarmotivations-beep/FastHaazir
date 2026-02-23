import { useState } from "react";
import { Plus, Minus, ShoppingCart } from "lucide-react";
import { useGroceryCart } from "@/context/GroceryCartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface ProductCardProps {
    product: any;
}

export default function ProductCard({ product }: ProductCardProps) {
    const { t } = useTranslation();
    const { items, addItem, updateQuantity } = useGroceryCart();

    const existingItem = items.find(i => i.id === product.id);
    const [qty, setQty] = useState(product.min_quantity || 0.5);

    const step = product.pricing_type === 'per_kg' ? 0.25 : 1;

    // Polished units
    const getUnitLabel = (type: string) => {
        switch (type) {
            case 'per_kg': return 'kg';
            case 'per_gram': return 'g';
            case 'per_piece': return 'pcs';
            case 'per_packet': return 'pkt';
            default: return 'unit';
        }
    };

    const unitLabel = getUnitLabel(product.pricing_type);
    const formatQty = (q: number, type: string) => {
        if (type === 'per_kg') return q.toFixed(2);
        if (type === 'per_gram') return Math.round(q);
        return q;
    };

    const unitPrice = product.discount_price || product.base_price;
    const currentQty = existingItem?.quantity || qty;
    const totalPrice = unitPrice * currentQty;

    const handleAdd = () => {
        addItem(product, qty);
    };

    const handleIncrement = () => {
        if (existingItem) {
            updateQuantity(product.id, existingItem.quantity + step);
        } else {
            setQty(prev => Math.min(prev + step, product.max_quantity || 100));
        }
    };

    const handleDecrement = () => {
        if (existingItem) {
            if (existingItem.quantity <= product.min_quantity) {
                // remove logic if needed
            } else {
                updateQuantity(product.id, existingItem.quantity - step);
            }
        } else {
            setQty(prev => Math.max(prev - step, product.min_quantity || 0.1));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="group bg-card rounded-[2rem] overflow-hidden border border-border/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col h-full"
        >
            {/* Image Section */}
            <div className="aspect-[4/3] relative overflow-hidden bg-muted/30">
                <img
                    src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"}
                    alt={product.name}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800";
                    }}
                />

                {/* Badges Overlay */}
                <div className="absolute top-3 inset-x-3 flex justify-between items-start pointer-events-none">
                    {product.discount_price ? (
                        <div className="bg-red-500/90 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg">
                            {Math.round(((product.base_price - product.discount_price) / product.base_price) * 100)}% OFF
                        </div>
                    ) : <div></div>}

                    {product.is_featured && (
                        <div className="bg-amber-400/90 backdrop-blur-md text-black text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg">
                            Top
                        </div>
                    )}
                </div>

                {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                    <div className="absolute bottom-3 right-3 bg-amber-500/90 backdrop-blur-md text-white text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest">
                        {t('grocery.onlyLeft')} {product.stock_quantity}
                    </div>
                )}

                {product.stock_quantity <= 0 && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[4px] flex items-center justify-center p-4">
                        <Badge variant="destructive" className="font-black text-[10px] uppercase tracking-widest px-4 py-1 rounded-full border-none shadow-xl">
                            {t('grocery.outOfStock')}
                        </Badge>
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="min-h-[40px]">
                    <h4 className="font-black text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {product.name}
                    </h4>
                </div>

                <div className="flex items-baseline gap-1.5 min-h-[1.5rem]">
                    <span className="text-xs font-bold text-muted-foreground">
                        PKR {unitPrice}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 font-medium">
                        / {unitLabel}
                    </span>
                </div>

                <div className="mt-auto space-y-4">
                    {/* Price and Quantity Control */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                            {product.discount_price && (
                                <span className="text-[10px] text-muted-foreground line-through decoration-red-500/50">
                                    PKR {product.base_price}
                                </span>
                            )}
                            <span className="text-xl font-black text-foreground tracking-tighter">
                                <span className="text-xs mr-0.5">₨</span>
                                {totalPrice.toFixed(0)}
                            </span>
                        </div>

                        {/* Quantity Controls - More professional layout */}
                        <div className="flex items-center bg-muted/40 p-1 rounded-2xl border border-border/40 backdrop-blur-sm group/qty">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDecrement(); }}
                                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background rounded-xl transition-all active:scale-90"
                            >
                                <Minus size={14} />
                            </button>
                            <div className="flex flex-col items-center px-2 min-w-[50px]">
                                <span className="text-xs font-black text-foreground">{currentQty}</span>
                                <span className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest">{unitLabel}</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleIncrement(); }}
                                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background rounded-xl transition-all active:scale-90"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>

                    <Button
                        onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                        disabled={product.stock_quantity <= 0}
                        className={`w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all duration-300 shadow-xl relative overflow-hidden ${existingItem
                            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 ring-4 ring-emerald-500/10'
                            : 'bg-primary hover:bg-primary/90 shadow-primary/30'
                            } ${product.stock_quantity <= 0 ? 'opacity-50 grayscale' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                    >
                        {existingItem && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 0.2, scale: 2 }}
                                className="absolute inset-0 bg-white rounded-full pointer-events-none"
                            />
                        )}
                        {existingItem ? (
                            <div className="flex items-center gap-2">
                                <span className="bg-white text-emerald-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black">
                                    {formatQty(currentQty, product.pricing_type)}
                                </span>
                                <span>{t('grocery.addedToCart')}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>{t('grocery.addToCart')}</span>
                            </div>
                        )}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

