import { useState } from "react";
import { Plus, Minus, ShoppingCart } from "lucide-react";
import { useGroceryCart } from "@/context/GroceryCartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface ProductCardProps {
    product: any;
}

export default function ProductCard({ product }: ProductCardProps) {
    const { items, addItem, updateQuantity } = useGroceryCart();

    const existingItem = items.find(i => i.id === product.id);
    const [qty, setQty] = useState(product.min_quantity || 0.5);

    const step = product.pricing_type === 'per_kg' ? 0.25 : 1;
    const unitLabel = product.pricing_type === 'per_kg' ? 'KG' :
        product.pricing_type === 'per_gram' ? 'g' :
            product.pricing_type === 'per_piece' ? 'PEC' : 'PKT';

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
                // remove is handled elsewhere or by specific logic
            } else {
                updateQuantity(product.id, existingItem.quantity - step);
            }
        } else {
            setQty(prev => Math.max(prev - step, product.min_quantity || 0.1));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface rounded-3xl overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all flex flex-col"
        >
            <div className="aspect-square relative overflow-hidden bg-muted group">
                <img
                    src={product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"}
                    alt={product.name}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800";
                    }}
                />
                {product.discount_price && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                        Save PKR {product.base_price - product.discount_price}
                    </div>
                )}
                {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                    <div className="absolute bottom-2 left-2 bg-amber-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                        Only {product.stock_quantity} Left
                    </div>
                )}
                {product.stock_quantity <= 0 && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                        <Badge variant="destructive" className="font-bold">Out of Stock</Badge>
                    </div>
                )}
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <h4 className="font-bold text-textPrimary text-sm leading-tight mb-1 line-clamp-1">{product.name}</h4>
                <p className="text-[10px] text-textSecondary mb-2 font-medium">Price: PKR {unitPrice}/{unitLabel}</p>

                <div className="mt-auto pt-2">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col">
                            <span className="text-xs text-textSecondary line-through h-4">
                                {product.discount_price ? `PKR ${product.base_price}` : ''}
                            </span>
                            <span className="text-lg font-black text-primary">PKR {totalPrice.toFixed(0)}</span>
                            <span className="text-[10px] text-textSecondary">Total: {currentQty} {unitLabel}</span>
                        </div>

                        <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border">
                            <button
                                onClick={handleDecrement}
                                className="w-7 h-7 flex items-center justify-center text-textPrimary hover:bg-background rounded-lg transition-colors"
                            >
                                <Minus size={14} />
                            </button>
                            <span className="w-10 text-center text-xs font-bold text-textPrimary">
                                {currentQty} {unitLabel}
                            </span>
                            <button
                                onClick={handleIncrement}
                                className="w-7 h-7 flex items-center justify-center text-textPrimary hover:bg-background rounded-lg transition-colors"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>

                    <Button
                        onClick={handleAdd}
                        disabled={product.stock_quantity <= 0}
                        className={`w-full h-10 rounded-xl font-bold transition-all ${existingItem ? 'bg-success hover:bg-success/90' : 'bg-primary hover:bg-primary/90'
                            }`}
                    >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {existingItem ? `In Cart (${currentQty} ${unitLabel})` : 'Add to Cart'}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
