import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Plus, Minus, MapPin, CreditCard, Loader2, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from "@/integrations/supabase/client";
import { useCart } from '@/context/CartContext';
import { useCreateOrder } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerAddresses } from '@/hooks/useCustomerAddresses';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { toast } from 'sonner';
import AddressMapPicker from '@/components/profile/AddressMapPicker';
import PayUpQR from '@/components/payment/PayUpQR';
import { createOnlinePayment, PaymentResponse } from '@/api/payment';
import { Banknote, QrCode } from 'lucide-react';

interface DeliveryLocation {
  lat: number;
  lng: number;
  address: string;
}

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart, totalPrice, deliveryFee } = useCart();
  const { user } = useAuth();
  const createOrder = useCreateOrder();
  const { data: savedAddresses = [] } = useCustomerAddresses();
  const { data: customerProfile } = useCustomerProfile();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [currentPayment, setCurrentPayment] = useState<PaymentResponse | null>(null);

  // Check if phone is verified for customers
  const isPhoneVerified = customerProfile?.phone_verified === true;

  // Set default address on load
  useEffect(() => {
    const defaultAddr = savedAddresses.find(a => a.is_default);
    if (defaultAddr && !deliveryLocation) {
      setDeliveryLocation({
        lat: defaultAddr.lat || 30.1798,
        lng: defaultAddr.lng || 66.975,
        address: defaultAddr.address_text,
      });
    } else if (!deliveryLocation && savedAddresses.length > 0) {
      const firstAddr = savedAddresses[0];
      setDeliveryLocation({
        lat: firstAddr.lat || 30.1798,
        lng: firstAddr.lng || 66.975,
        address: firstAddr.address_text,
      });
    }
  }, [savedAddresses, deliveryLocation]);

  const handleCheckout = async () => {
    if (items.length === 0) return;

    // Block order placement if not authenticated
    if (!user) {
      toast.error("Please login to place an order");
      navigate('/auth');
      return;
    }

    // Check if user is admin - they can bypass verification
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });

    // Check phone verification for customers (if profile exists)
    if (customerProfile && !customerProfile.phone_verified && !isAdmin) {
      toast.error("Phone verification required to place orders");
      navigate('/complete-profile');
      return;
    }

    // If no profile and not admin, we might want to warn but not block for now
    if (!customerProfile && !isAdmin) {
      console.log("[Cart] No customer profile found, but allowing order for now...");
    }

    if (!deliveryLocation || !deliveryLocation.address) {
      toast.error("Please select a delivery address");
      return;
    }

    setIsCheckingOut(true);

    try {
      // 1. Create the order first
      const order = await createOrder.mutateAsync({
        business_id: items[0].businessId,
        business_name: items[0].businessName,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        subtotal: totalPrice,
        delivery_fee: deliveryFee,
        total: totalPrice + deliveryFee,
        delivery_address: deliveryLocation.address,
        delivery_lat: deliveryLocation.lat,
        delivery_lng: deliveryLocation.lng,
      });

      // 2. Handle Payment
      if (paymentMethod === 'online') {
        try {
          const totalAmount = totalPrice + deliveryFee;
          const payment = await createOnlinePayment(order.id, totalAmount, user.id);
          setCurrentPayment(payment);
          // Don't navigate or clear cart yet, wait for payment success
        } catch (paymentError) {
          console.error('Payment creation error:', paymentError);
          toast.error("Order placed, but payment init failed", {
            description: "You can try paying from order history or pay cash.",
          });
          clearCart();
          navigate('/orders');
        }
      } else {
        // Cash on Delivery
        toast.success("Order Placed! 🎉", {
          description: "Your order has been confirmed. Rider will be assigned shortly.",
        });
        clearCart();
        navigate('/orders');
      }

    } catch (error) {
      console.error('Checkout error:', error);
      toast.error("Failed to place order", {
        description: "Please try again.",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  useEffect(() => {
    document.title = "Your Cart | Fast Haazir Quetta";
  }, []);

  const handlePaymentSuccess = () => {
    setCurrentPayment(null);
    clearCart();
    navigate('/orders');
  };

  const handlePaymentCancel = () => {
    setCurrentPayment(null);
    toast.info("Payment cancelled", {
      description: "Order has been placed. You can view it in your orders.",
    });
    clearCart();
    navigate('/orders');
  };

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setDeliveryLocation(location);
    setShowMapPicker(false);
    toast.success("Delivery location updated!");
  };

  if (showMapPicker) {
    return (
      <AddressMapPicker
        onSelect={handleLocationSelect}
        onBack={() => setShowMapPicker(false)}
        initialLocation={deliveryLocation ? { lat: deliveryLocation.lat, lng: deliveryLocation.lng } : undefined}
      />
    );
  }

  if (items.length === 0) {
    return (
      <div className="mobile-container bg-background min-h-screen">
        <header className="sticky top-0 z-50 glass border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="icon" size="icon-sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-foreground">Your Cart</h1>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4"
          >
            <span className="text-4xl">🛒</span>
          </motion.div>
          <h2 className="font-bold text-lg mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground text-sm text-center mb-6">
            Add items from restaurants to start your order
          </p>
          <Button onClick={() => navigate('/')}>
            Browse Restaurants
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-background min-h-screen pb-48">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="icon" size="icon-sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-foreground">Your Cart</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </header>

      {/* Cart Items */}
      <div className="p-4 space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card variant="elevated" className="p-4">
            <p className="text-xs text-muted-foreground mb-2">From</p>
            <p className="font-semibold">{items[0]?.businessName}</p>
          </Card>
        </motion.div>

        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card variant="elevated" className="p-3">
              <div className="flex gap-3">
                <img
                  src={item.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop'}
                  alt={item.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{item.name}</h3>
                  <p className="text-primary font-bold text-sm mt-1">
                    Rs. {(item.price * item.quantity).toLocaleString()}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-7 px-2"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    <div className="flex items-center gap-3 bg-muted rounded-xl p-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="font-bold w-4 text-center">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Delivery Address */}
      <div className="px-4 mb-4">
        <Card variant="elevated" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Deliver to</p>
              <p className="font-semibold text-sm truncate">
                {deliveryLocation?.address || 'Select delivery location'}
              </p>
              {deliveryLocation?.lat && (
                <p className="text-xs text-muted-foreground">
                  📍 {deliveryLocation.lat.toFixed(4)}, {deliveryLocation.lng.toFixed(4)}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMapPicker(true)}
            >
              {deliveryLocation ? 'Change' : 'Select'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Payment Method Selection */}
      <div className="px-4 mb-4">
        <Card variant="elevated" className="p-4">
          <h3 className="font-semibold text-sm mb-3">Payment Method</h3>
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => setPaymentMethod('cash')}
              className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}
            >
              <Banknote className={`w-6 h-6 ${paymentMethod === 'cash' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-xs font-medium ${paymentMethod === 'cash' ? 'text-primary' : 'text-muted-foreground'}`}>Cash on Delivery</span>
            </div>
            <div
              onClick={() => setPaymentMethod('online')}
              className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'online' ? 'border-green-500 bg-green-500/5' : 'border-border hover:bg-muted'}`}
            >
              <QrCode className={`w-6 h-6 ${paymentMethod === 'online' ? 'text-green-600' : 'text-muted-foreground'}`} />
              <span className={`text-xs font-medium ${paymentMethod === 'online' ? 'text-green-600' : 'text-muted-foreground'}`}>PayUp QR</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Phone Verification Banner */}
      {user && !isPhoneVerified && (
        <div className="px-4 mb-4">
          <Card variant="elevated" className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <Phone className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-amber-800 dark:text-amber-200">Verify your phone</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Required to place orders</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
                onClick={() => navigate('/complete-profile')}
              >
                Verify Now
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Order Summary & Checkout - Fixed at bottom */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[414px] z-50 glass border-t border-border/50 p-4">
        <Card variant="elevated" className="p-4 mb-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>Rs. {totalPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>Rs. {deliveryFee}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-primary">Rs. {(totalPrice + deliveryFee).toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <Button
          className={`w-full ${paymentMethod === 'online' ? 'bg-green-600 hover:bg-green-700' : ''}`}
          size="lg"
          onClick={handleCheckout}
          disabled={isCheckingOut || !deliveryLocation}
        >
          {isCheckingOut ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {paymentMethod === 'online' ? <QrCode className="w-5 h-5 mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
              {paymentMethod === 'online' ? `Pay Rs. ${(totalPrice + deliveryFee).toLocaleString()}` : 'Place Order • Cash on Delivery'}
            </>
          )}
        </Button>
      </div>

      {/* PayUp QR Modal */}
      {currentPayment && (
        <PayUpQR
          transactionId={currentPayment.transaction_id}
          qrString={currentPayment.qr_url}
          paymentUrl={currentPayment.payment_url}
          expiresIn={currentPayment.expires_in}
          amount={totalPrice + deliveryFee}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}
    </div>
  );
};

export default Cart;