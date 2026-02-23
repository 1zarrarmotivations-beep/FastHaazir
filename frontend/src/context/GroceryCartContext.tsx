import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

export type PricingType = 'per_kg' | 'per_gram' | 'per_piece' | 'fixed_pack';

export interface GroceryCartItem {
    id: string;
    name: string;
    image_url?: string;
    pricing_type: PricingType;
    base_price: number;
    discount_price?: number;
    quantity: number;
    min_quantity: number;
    max_quantity: number;
}

export interface GroceryProduct {
    id: string;
    name: string;
    image_url?: string;
    pricing_type: PricingType;
    base_price: number;
    discount_price?: number;
    min_quantity: number;
    max_quantity: number;
}

interface GroceryCartContextType {
    items: GroceryCartItem[];
    addItem: (product: GroceryProduct, quantity: number) => void;
    updateQuantity: (id: string, quantity: number) => void;
    removeItem: (id: string) => void;
    clearCart: () => void;
    totalItems: number;
    subtotal: number;
    deliveryFee: number;
    setDeliveryFee: (fee: number) => void;
    total: number;
    minOrderValue: number;
    setMinOrderValue: (value: number) => void;
    canPlaceOrder: boolean;
}

const GroceryCartContext = createContext<GroceryCartContextType | undefined>(undefined);

export const GroceryCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<GroceryCartItem[]>(() => {
        const saved = localStorage.getItem('fasthaazir_grocery_cart');
        return saved ? JSON.parse(saved) : [];
    });

    const [minOrderValue, setMinOrderValue] = useState<number>(500);
    const [deliveryFee, setDeliveryFee] = useState<number>(50);

    useEffect(() => {
        localStorage.setItem('fasthaazir_grocery_cart', JSON.stringify(items));
    }, [items]);

    const addItem = (product: GroceryProduct, quantity: number) => {
        setItems(current => {
            const existing = current.find(i => i.id === product.id);
            if (existing) {
                return current.map(i =>
                    i.id === product.id
                        ? { ...i, quantity: Math.min(i.quantity + quantity, i.max_quantity) }
                        : i
                );
            }
            return [...current, {
                id: product.id,
                name: product.name,
                image_url: product.image_url,
                pricing_type: product.pricing_type,
                base_price: product.base_price,
                discount_price: product.discount_price,
                quantity: quantity,
                min_quantity: product.min_quantity || 0.1,
                max_quantity: product.max_quantity || 100
            }];
        });
        toast.success(`${product.name} added to cart`);
    };

    const updateQuantity = (id: string, quantity: number) => {
        setItems(current =>
            current.map(i => {
                if (i.id === id) {
                    const newQty = Math.max(i.min_quantity, Math.min(quantity, i.max_quantity));
                    return { ...i, quantity: newQty };
                }
                return i;
            })
        );
    };

    const removeItem = (id: string) => {
        setItems(current => current.filter(i => i.id !== id));
    };

    const clearCart = () => {
        setItems([]);
    };

    const subtotal = items.reduce((acc, item) => {
        const price = item.discount_price || item.base_price;
        return acc + (price * item.quantity);
    }, 0);

    const total = subtotal + deliveryFee;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    const canPlaceOrder = subtotal >= minOrderValue;

    return (
        <GroceryCartContext.Provider value={{
            items,
            addItem,
            updateQuantity,
            removeItem,
            clearCart,
            totalItems,
            subtotal,
            deliveryFee,
            setDeliveryFee,
            total,
            minOrderValue,
            setMinOrderValue,
            canPlaceOrder
        }}>
            {children}
        </GroceryCartContext.Provider>
    );
};

export const useGroceryCart = () => {
    const context = useContext(GroceryCartContext);
    if (!context) throw new Error('useGroceryCart must be used within GroceryCartProvider');
    return context;
};
