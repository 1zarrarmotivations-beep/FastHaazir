import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const FloatingCart = forwardRef<HTMLDivElement>((_, ref) => {
  const { totalItems, totalPrice, deliveryFee } = useCart();
  const navigate = useNavigate();

  if (totalItems === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.8 }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[382px] z-40"
      >
        <Button
          onClick={() => navigate('/cart')}
          className="w-full h-16 justify-between rounded-2xl shadow-elevated"
          size="lg"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingBag className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-accent rounded-full text-[10px] font-bold flex items-center justify-center text-accent-foreground">
                {totalItems}
              </span>
            </div>
            <span className="font-semibold">View Cart</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold">Rs. {(totalPrice + deliveryFee).toLocaleString()}</span>
            <ChevronRight className="w-5 h-5" />
          </div>
        </Button>
      </motion.div>
    </AnimatePresence>
  );
});

FloatingCart.displayName = 'FloatingCart';

export default FloatingCart;
