import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    Trash2,
    Plus,
    Minus,
    MapPin,
    CreditCard,
    ShoppingBag,
    Info,
    ChevronRight,
    CheckCircle2,
    Clock,
    Tag,
    Wallet,
    Truck,
    Calendar,
    Navigation,
    Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGroceryCart } from "@/context/GroceryCartContext";
import { useCustomerAddresses, useDefaultAddress, useCreateAddress } from "@/hooks/useCustomerAddresses";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutSchedulingModal } from "@/components/scheduling/CheckoutSchedulingModal";
import { format } from "date-fns";

type PaymentMethod = 'cod' | 'wallet' | 'card';

interface PromoCode {
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
}

interface TimeSlot {
    id: string;
    label: string;
    time: string;
    available: boolean;
}

const FREE_DELIVERY_THRESHOLD = 1000;

const TIME_SLOTS: TimeSlot[] = [
    { id: 'now', label: 'Deliver Now', time: ' ASAP', available: true },
    { id: 'morning', label: 'Morning', time: ' 9 AM - 12 PM', available: true },
    { id: 'afternoon', label: 'Afternoon', time: ' 12 PM - 3 PM', available: true },
    { id: 'evening', label: 'Evening', time: ' 5 PM - 8 PM', available: true },
    { id: 'night', label: 'Night', time: ' 8 PM - 10 PM', available: true },
];

export default function GroceryCart() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const {
        items,
        updateQuantity,
        removeItem,
        clearCart,
        subtotal,
        deliveryFee,
        setDeliveryFee,
        total,
        minOrderValue
    } = useGroceryCart();

    const { data: addresses = [], isLoading: addressesLoading } = useCustomerAddresses();
    const { data: defaultAddress } = useDefaultAddress();
    const createAddress = useCreateAddress();

    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [orderComplete, setOrderComplete] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState<string>('');
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('now');
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number>(0);

    // Scheduling state
    const [isScheduleEnabled, setIsScheduleEnabled] = useState(false);
    const [showSchedulingModal, setShowSchedulingModal] = useState(false);
    const [scheduledOrderData, setScheduledOrderData] = useState<{
        scheduledDate: string;
        slotId: string;
        slotName: string;
        scheduledDateTime: string;
        notes?: string;
    } | null>(null);
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

    // Initialize address from default
    useEffect(() => {
        if (defaultAddress && !selectedAddressId) {
            setSelectedAddressId(defaultAddress.id);
        } else if (addresses.length > 0 && !selectedAddressId) {
            setSelectedAddressId(addresses[0].id);
        }
    }, [defaultAddress, addresses, selectedAddressId]);

    // Fetch wallet balance
    useEffect(() => {
        const fetchWalletBalance = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: wallet } = await supabase
                .from('customer_wallets')
                .select('balance')
                .eq('user_id', user.id)
                .maybeSingle();

            if (wallet) {
                setWalletBalance(wallet.balance || 0);
            }
        };
        fetchWalletBalance();
    }, []);

    // Calculate dynamic delivery fee
    useEffect(() => {
        if (subtotal >= FREE_DELIVERY_THRESHOLD) {
            setDeliveryFee(0);
        } else {
            setDeliveryFee(50);
        }
    }, [subtotal, setDeliveryFee]);

    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    const displayAddress = selectedAddress ? selectedAddress.address_text :
        defaultAddress ? defaultAddress.address_text :
            "No address selected";

    const progressValue = Math.min((subtotal / minOrderValue) * 100, 100);
    const isMinMet = subtotal >= minOrderValue;
    const discount = appliedPromo ?
        appliedPromo.type === 'percentage' ?
            (subtotal * appliedPromo.discount / 100) :
            appliedPromo.discount
        : 0;
    const finalSubtotal = subtotal - discount;
    const finalTotal = finalSubtotal + deliveryFee;

    const formatQuantity = (item: typeof items[0]) => {
        const qty = item.quantity;
        const pricingType = item.pricing_type;

        if (pricingType === 'per_kg') {
            return qty >= 1 ? `${qty} KG` : `${qty * 1000}g`;
        } else if (pricingType === 'per_gram') {
            return `${qty}g`;
        } else if (pricingType === 'per_piece' || pricingType === 'fixed_pack') {
            return `${qty} ${qty === 1 ? 'pc' : 'pcs'}`;
        }
        return `${qty}`;
    };

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) {
            toast.error("Please enter a promo code");
            return;
        }

        setIsApplyingPromo(true);
        try {
            // Simulate promo code validation - in real app, check against database
            const promoCodes: Record<string, PromoCode> = {
                'FIRST20': { code: 'FIRST20', discount: 20, type: 'percentage' },
                'FAST50': { code: 'FAST50', discount: 50, type: 'fixed' },
                'SAVE10': { code: 'SAVE10', discount: 10, type: 'percentage' },
            };

            const promo = promoCodes[promoCode.toUpperCase()];
            if (promo) {
                setAppliedPromo(promo);
                toast.success(`Promo code applied! You save PKR ${promo.type === 'percentage' ? (subtotal * promo.discount / 100).toFixed(0) : promo.discount}`);
            } else {
                toast.error("Invalid promo code");
            }
        } catch (error) {
            toast.error("Failed to apply promo code");
        } finally {
            setIsApplyingPromo(false);
        }
    };

    const handleRemovePromo = () => {
        setAppliedPromo(null);
        setPromoCode('');
        toast.info("Promo code removed");
    };

    const handlePlaceOrder = async () => {
        if (!isMinMet) {
            toast.error(`Minimum order value is PKR ${minOrderValue}. You need PKR ${minOrderValue - subtotal} more.`);
            return;
        }

        if (!selectedAddressId) {
            toast.error("Please select a delivery address");
            return;
        }

        // Wallet payment validation
        if (paymentMethod === 'wallet') {
            if (walletBalance < finalTotal) {
                toast.error(`Insufficient wallet balance. You need PKR ${(finalTotal - walletBalance).toFixed(0)} more.`);
                return;
            }
        }

        setIsPlacingOrder(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate("/auth");
                return;
            }

            // Deduct from wallet if using wallet payment
            if (paymentMethod === 'wallet') {
                const { error: walletError } = await supabase
                    .from('customer_wallets')
                    .update({ balance: walletBalance - finalTotal })
                    .eq('user_id', user.id);

                if (walletError) throw walletError;
            }

            // Prepare scheduled datetime if scheduling is enabled
            let scheduledDateTime = null;
            if (isScheduleEnabled && scheduledOrderData) {
                scheduledDateTime = `${scheduledOrderData.scheduledDate} ${scheduledOrderData.slotName}`;
            }

            // 1. Create Order
            const { data: order, error: orderError } = await supabase
                .from('grocery_orders')
                .insert({
                    customer_id: user.id,
                    total_amount: finalTotal,
                    delivery_address: displayAddress,
                    status: 'pending',
                    payment_method: paymentMethod,
                    delivery_time: isScheduleEnabled && scheduledOrderData
                        ? scheduledOrderData.scheduledDateTime
                        : (selectedTimeSlot !== 'now' ? TIME_SLOTS.find(t => t.id === selectedTimeSlot)?.label : 'ASAP'),
                    promo_code: appliedPromo?.code || null,
                    discount_amount: discount || null,
                    // Add scheduling fields if enabled
                    scheduled_datetime: isScheduleEnabled && scheduledOrderData
                        ? scheduledDateTime
                        : null,
                    slot_id: isScheduleEnabled && scheduledOrderData
                        ? scheduledOrderData.slotId
                        : null
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Create Order Items
            const orderItems = items.map(item => ({
                order_id: order.id,
                product_id: item.id,
                quantity: item.quantity,
                unit_price: item.discount_price || item.base_price,
                subtotal: (item.discount_price || item.base_price) * item.quantity
            }));

            const { error: itemsError } = await supabase
                .from('grocery_order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // 3. If scheduling is enabled, create the scheduled_order record
            if (isScheduleEnabled && scheduledOrderData) {
                const { error: scheduleError } = await supabase
                    .from('scheduled_orders')
                    .insert({
                        order_id: order.id,
                        user_id: user.id,
                        scheduled_date: scheduledOrderData.scheduledDate,
                        slot_id: scheduledOrderData.slotId,
                        scheduled_datetime: format(new Date(`${scheduledOrderData.scheduledDate}T${scheduledOrderData.slotName.split(' - ')[0]}`), "yyyy-MM-dd'T'HH:mm:ss"),
                        status: 'pending',
                        notes: scheduledOrderData.notes || null
                    });

                if (scheduleError) {
                    console.error('Failed to create scheduled order record:', scheduleError);
                    // Don't fail the order, but log the error
                }
            }

            setOrderComplete(true);
            clearCart();
            toast.success(isScheduleEnabled ? "Order scheduled successfully!" : "Order placed successfully!");
        } catch (err: any) {
            toast.error(err.message || "Failed to place order");
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const handleSelectAddress = (addressId: string) => {
        setSelectedAddressId(addressId);
        setShowAddressModal(false);
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude: lat, longitude: lng } = position.coords;

                // Reverse geocode using Nominatim (free, no API key required)
                let addressText = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                        { headers: { 'Accept-Language': 'en' } }
                    );
                    if (response.ok) {
                        const data = await response.json();
                        if (data.display_name) {
                            addressText = data.display_name;
                        }
                    }
                } catch (err) {
                    console.warn('[GroceryCart] Reverse geocode failed, using coordinates', err);
                }

                try {
                    const newAddress = await createAddress.mutateAsync({
                        label: 'Current Location',
                        address_text: addressText,
                        lat,
                        lng,
                        is_default: addresses.length === 0,
                    });
                    setSelectedAddressId(newAddress.id);
                    setShowAddressModal(false);
                    toast.success('Current location saved and selected!');
                } catch (err) {
                    console.error('[GroceryCart] Failed to save current location', err);
                    toast.error('Failed to save current location');
                } finally {
                    setIsGettingLocation(false);
                }
            },
            (error) => {
                setIsGettingLocation(false);
                if (error.code === error.PERMISSION_DENIED) {
                    toast.error('Location permission denied. Please allow location access.');
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    toast.error('Location unavailable. Please try again.');
                } else {
                    toast.error('Could not get your location. Please try again.');
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    };

    if (orderComplete) {
        return (
            <div className="mobile-container flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-success/20 text-success rounded-full flex items-center justify-center"
                >
                    <CheckCircle2 size={48} />
                </motion.div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black">Order Received!</h2>
                    <p className="text-muted-foreground">Your fresh groceries are being packed. A rider will be assigned soon.</p>
                </div>
                <Card className="w-full bg-muted/30 border-none rounded-3xl">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Delivery to</span>
                            <span className="font-bold">{displayAddress.split(',')[0]}...</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Payment Mode</span>
                            <span className="font-bold">
                                {paymentMethod === 'cod' ? 'Cash on Delivery' :
                                    paymentMethod === 'wallet' ? 'Wallet' : 'Card'}
                            </span>
                        </div>
                        {selectedTimeSlot !== 'now' && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Delivery Time</span>
                                <span className="font-bold">{TIME_SLOTS.find(t => t.id === selectedTimeSlot)?.label}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Button className="w-full h-14 rounded-2xl font-black text-lg" onClick={() => navigate("/orders")}>
                    Track My Orders
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => navigate("/grocery")}>
                    Back to Shop
                </Button>
            </div>
        );
    }

    return (
        <div className="mobile-container bg-surface min-h-screen pb-32">
            <header className="sticky top-0 z-[100] bg-surface/90 backdrop-blur-xl border-b border-border/50 px-4 py-4 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full bg-muted/50">
                    <ArrowLeft size={18} />
                </Button>
                <h1 className="font-black text-xl">{t('grocery.myBasket')}</h1>
            </header>

            <div className="p-4 space-y-6">
                {/* Min Order Progress */}
                <Card className={`rounded-3xl border-none shadow-sm ${isMinMet ? 'bg-success/5' : 'bg-amber-500/5'}`}>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                            <span className={isMinMet ? 'text-success' : 'text-amber-600'}>
                                {isMinMet ? 'Minimum Order Met!' : `PKR ${(minOrderValue - subtotal).toFixed(0)} more for minimum`}
                            </span>
                            <span className="text-textSecondary">PKR {minOrderValue} Min</span>
                        </div>
                        <Progress value={progressValue} className={`h-2 rounded-full ${isMinMet ? 'bg-success/20' : 'bg-amber-500/20'}`} />
                        {!isMinMet && (
                            <p className="text-[10px] text-amber-600/80 font-bold flex items-center gap-1">
                                <Info size={10} /> Orders below PKR {minOrderValue} cannot be placed for delivery.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Cart Items */}
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {items.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex items-center gap-4 bg-white dark:bg-muted/20 p-4 rounded-[2rem] shadow-sm border border-border/40 group relative overflow-hidden"
                            >
                                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-muted/30 border border-border/50 flex-shrink-0">
                                    <img src={item.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-sm text-foreground line-clamp-1 mb-1">{item.name}</h4>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0 border-primary/20 text-primary bg-primary/5">
                                            PKR {item.discount_price || item.base_price} / {item.pricing_type === 'per_kg' ? 'KG' : item.pricing_type === 'per_gram' ? 'g' : 'Pcs'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center bg-muted/50 rounded-xl p-0.5 border border-border/40">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - (item.pricing_type === 'per_kg' ? 0.25 : 1))}
                                                className="w-7 h-7 flex items-center justify-center hover:bg-background rounded-lg transition-all active:scale-90"
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="w-14 text-center text-xs font-black">{formatQuantity(item)}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + (item.pricing_type === 'per_kg' ? 0.25 : 1))}
                                                className="w-7 h-7 flex items-center justify-center hover:bg-background rounded-lg transition-all active:scale-90"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 pr-2">
                                    <span className="font-black text-base text-primary tracking-tighter">
                                        ₨ {Number((item.discount_price || item.base_price) * item.quantity).toFixed(0)}
                                    </span>
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="p-2 text-muted-foreground/40 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                        {items.length === 0 && (
                            <div className="text-center py-20 px-6">
                                <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <ShoppingBag size={48} className="text-muted-foreground/20" />
                                </div>
                                <h3 className="font-black text-xl mb-2">{t('grocery.emptyBasketTitle')}</h3>
                                <p className="text-muted-foreground text-sm font-medium mb-8">{t('grocery.emptyBasketDesc')}</p>
                                <Button className="w-full h-14 rounded-2xl font-black text-lg shadow-xl" onClick={() => navigate("/grocery")}>
                                    {t('grocery.startShopping')}
                                </Button>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {items.length > 0 && (
                    <>
                        {/* Delivery & Schedule Details */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t('grocery.deliveryPreferences')}</h3>
                            </div>

                            <Card className="rounded-[2.5rem] border-none bg-white dark:bg-muted/10 shadow-sm overflow-hidden">
                                <CardContent className="p-0">
                                    {/* Address Section */}
                                    <div className="p-6 border-b border-border/50 group active:bg-muted/40 transition-colors" onClick={() => setShowAddressModal(true)}>
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                                <MapPin size={24} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">{t('grocery.deliverTo')}</p>
                                                    <ChevronRight size={14} className="text-muted-foreground" />
                                                </div>
                                                <p className="text-sm font-black text-foreground truncate">{displayAddress.split(',')[0]}...</p>
                                                <p className="text-xs text-muted-foreground truncate">{displayAddress}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timing Section */}
                                    <div className="p-6 space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Clock size={16} className="text-blue-500" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">{t('grocery.deliveryTime')}</p>
                                            </div>

                                            <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl px-2">
                                                <span className="text-[10px] font-black uppercase text-muted-foreground mr-1">{t('grocery.schedule')}</span>
                                                <Switch
                                                    checked={isScheduleEnabled}
                                                    onCheckedChange={(checked) => {
                                                        setIsScheduleEnabled(checked);
                                                        if (checked) setShowSchedulingModal(true);
                                                        else setScheduledOrderData(null);
                                                    }}
                                                    className="scale-75"
                                                />
                                            </div>
                                        </div>

                                        {isScheduleEnabled && scheduledOrderData ? (
                                            <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-primary/70 mb-0.5">{t('grocery.scheduledFor')}</p>
                                                    <p className="text-sm font-black">{scheduledOrderData.scheduledDateTime}</p>
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={() => setShowSchedulingModal(true)} className="text-primary text-[10px] font-black uppercase">{t('grocery.change')}</Button>
                                            </div>
                                        ) : !isScheduleEnabled && (
                                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                                {TIME_SLOTS.map((slot) => (
                                                    <button
                                                        key={slot.id}
                                                        onClick={() => setSelectedTimeSlot(slot.id)}
                                                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 transition-all font-black text-[10px] uppercase tracking-wider ${selectedTimeSlot === slot.id
                                                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105'
                                                                : 'bg-muted/30 border-transparent text-muted-foreground'
                                                            }`}
                                                    >
                                                        {slot.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Order Summary & Bill */}
                        <div className="space-y-4">
                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-2">{t('grocery.orderSummary')}</h3>

                            <Card className="rounded-[2.5rem] border-none bg-white dark:bg-muted/10 shadow-sm overflow-hidden">
                                <CardContent className="p-6 space-y-6">
                                    {/* Promo Input */}
                                    {!appliedPromo ? (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={promoCode}
                                                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                                placeholder={t('grocery.promoCodePlaceholder')}
                                                className="w-full h-12 pl-12 pr-24 bg-muted/30 border-none rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-2 ring-primary/20 transition-all"
                                            />
                                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                            <button
                                                onClick={handleApplyPromo}
                                                disabled={isApplyingPromo || !promoCode}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 active:scale-95 transition-all"
                                            >
                                                {isApplyingPromo ? '...' : t('grocery.apply')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="bg-success/5 border border-success/20 p-4 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center text-success">
                                                    <Tag size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-success/70">{t('grocery.promoApplied')}</p>
                                                    <p className="text-xs font-black">{appliedPromo.code}</p>
                                                </div>
                                            </div>
                                            <button onClick={handleRemovePromo} className="text-red-500 hover:text-red-600 transition-colors">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Bill Breakdown */}
                                    <div className="space-y-4 pt-2">
                                        <div className="flex justify-between items-center text-sm font-medium">
                                            <span className="text-muted-foreground">{t('grocery.itemTotal')}</span>
                                            <span className="font-black">₨ {subtotal.toFixed(0)}</span>
                                        </div>

                                        {discount > 0 && (
                                            <div className="flex justify-between items-center text-sm font-medium text-success">
                                                <span className="flex items-center gap-1.5">
                                                    <Tag size={14} />
                                                    {t('grocery.promoDiscount')}
                                                </span>
                                                <span className="font-black">-₨ {discount.toFixed(0)}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center text-sm font-medium">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <Truck size={14} />
                                                {t('grocery.deliveryFee')}
                                            </span>
                                            {deliveryFee === 0 ? (
                                                <span className="text-success font-black tracking-widest text-[10px] bg-success/10 px-2 py-0.5 rounded-full uppercase">{t('grocery.free')}</span>
                                            ) : (
                                                <span className="font-black">₨ {deliveryFee.toFixed(0)}</span>
                                            )}
                                        </div>

                                        <div className="pt-4 border-t border-border flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{t('grocery.toPay')}</p>
                                                <p className="text-3xl font-black text-foreground tracking-tighter leading-none">
                                                    <span className="text-sm mr-1">₨</span>
                                                    {finalTotal.toFixed(0)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <Badge className="bg-success/10 text-success border-none text-[8px] font-black uppercase tracking-[0.1em] px-2 py-1">
                                                    {t('grocery.inclusiveOfAllTaxes')}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Payment Method Selection - Premium Style */}
                            <div className="space-y-4">
                                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-2">{t('grocery.paymentMethod')}</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setPaymentMethod('cod')}
                                        className={`p-4 rounded-[2rem] border-2 transition-all text-left flex flex-col gap-2 ${paymentMethod === 'cod'
                                                ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5'
                                                : 'bg-white dark:bg-muted/10 border-transparent'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${paymentMethod === 'cod' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <CreditCard size={16} />
                                        </div>
                                        <p className="text-xs font-black uppercase tracking-tight">{t('grocery.cod')}</p>
                                    </button>

                                    <button
                                        onClick={() => setPaymentMethod('wallet')}
                                        className={`p-4 rounded-[2rem] border-2 transition-all text-left flex flex-col gap-2 ${paymentMethod === 'wallet'
                                                ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5'
                                                : 'bg-white dark:bg-muted/10 border-transparent'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${paymentMethod === 'wallet' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <Wallet size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tight">{t('grocery.wallet')}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground line-clamp-1">₨ {walletBalance.toFixed(0)}</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Place Order CTA */}
            {items.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/80 backdrop-blur-xl border-t border-border z-[200]">
                    <Button
                        disabled={!isMinMet || isPlacingOrder}
                        onClick={handlePlaceOrder}
                        className={`w-full h-14 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 ${isPlacingOrder ? 'opacity-50' : ''
                            }`}
                    >
                        {isPlacingOrder ? 'Placing Order...' : isMinMet ? `Pay PKR ${finalTotal.toFixed(0)}` : `Add PKR ${(minOrderValue - subtotal).toFixed(0)} More`}
                    </Button>
                </div>
            )}

            {/* Address Selection Modal */}
            <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
                <DialogContent className="sm:max-w-md rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black">Select Address</DialogTitle>
                        <DialogDescription>
                            Choose a delivery address or use your current location
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {/* Use Current Location Button */}
                        <button
                            onClick={handleUseCurrentLocation}
                            disabled={isGettingLocation || createAddress.isPending}
                            className="w-full text-left p-4 rounded-xl border border-primary/30 hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-60"
                        >
                            <div className="flex items-center gap-3">
                                {isGettingLocation || createAddress.isPending ? (
                                    <Loader2 size={18} className="text-primary animate-spin flex-shrink-0" />
                                ) : (
                                    <Navigation size={18} className="text-primary flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-primary">
                                        {isGettingLocation ? 'Getting your location...' : 'Use Current Location'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Detect & save your GPS location</p>
                                </div>
                            </div>
                        </button>

                        {/* Divider */}
                        {(addressesLoading || addresses.length > 0) && (
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs text-muted-foreground font-medium">Saved Addresses</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>
                        )}

                        {addressesLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 size={20} className="animate-spin text-primary" />
                            </div>
                        ) : addresses.length === 0 ? (
                            <div className="text-center py-4">
                                <p className="text-muted-foreground text-sm">No saved addresses yet</p>
                                <p className="text-xs text-muted-foreground mt-1">Use current location above or add one from your profile</p>
                            </div>
                        ) : (
                            addresses.map((addr) => (
                                <button
                                    key={addr.id}
                                    onClick={() => handleSelectAddress(addr.id)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${selectedAddressId === addr.id
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <MapPin size={18} className="text-primary mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm">{addr.label}</span>
                                                {addr.is_default && (
                                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">Default</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{addr.address_text}</p>
                                        </div>
                                        {selectedAddressId === addr.id && (
                                            <CheckCircle2 size={18} className="text-primary flex-shrink-0 mt-0.5" />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Scheduling Modal */}
            <CheckoutSchedulingModal
                isOpen={showSchedulingModal}
                onClose={() => setShowSchedulingModal(false)}
                onScheduled={(scheduleData) => {
                    setScheduledOrderData(scheduleData);
                    setShowSchedulingModal(false);
                }}
                orderId={createdOrderId || 'pending'}
            />
        </div>
    );
}
