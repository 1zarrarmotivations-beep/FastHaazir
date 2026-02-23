import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    MapPin,
    Clock,
    CheckCircle2,
    Truck,
    ShoppingBag,
    Star,
    RefreshCw,
    Package,
    Locate,
    X
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useMyGroceryOrders, useGroceryOrderTimeline } from "@/hooks/useGroceryAdmin";
import { useGroceryCart } from "@/context/GroceryCartContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
    placed: { color: "text-blue-600", bg: "bg-blue-100", icon: ShoppingBag, label: "Order Placed" },
    preparing: { color: "text-amber-600", bg: "bg-amber-100", icon: Package, label: "Preparing" },
    on_way: { color: "text-orange-600", bg: "bg-orange-100", icon: Truck, label: "On the Way" },
    delivered: { color: "text-green-600", bg: "bg-green-100", icon: CheckCircle2, label: "Delivered" },
    cancelled: { color: "text-red-600", bg: "bg-red-100", icon: X, label: "Cancelled" },
};

export default function GroceryOrders() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { orderId } = useParams();
    const { data: orders, isLoading } = useMyGroceryOrders();
    const { addItem } = useGroceryCart();

    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [showTracking, setShowTracking] = useState(!!orderId);

    const activeOrder = orderId ? orders?.find(o => o.id === orderId) : null;
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    const filteredOrders = orders?.filter(order => {
        if (!statusFilter) return true;
        return order.status === statusFilter;
    }) || [];

    const orderStatuses = ['placed', 'preparing', 'on_way', 'delivered'];

    const getStatusIcon = (status: string) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.placed;
        return config.icon;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-PK', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleReorder = (order: any) => {
        order.items?.forEach((item: any) => {
            addItem(
                {
                    id: item.product_id,
                    name: item.name,
                    image_url: item.product?.image_url,
                    pricing_type: 'per_piece',
                    base_price: item.unit_price,
                    min_quantity: 1,
                    max_quantity: 100
                },
                item.quantity
            );
        });
        toast.success("Items added to cart!");
        navigate("/grocery/cart");
    };

    if (orderId && activeOrder) {
        return <OrderTracking order={activeOrder} onBack={() => navigate('/grocery/orders')} />;
    }

    return (
        <div className="mobile-container bg-surface min-h-screen pb-24">
            <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-xl border-b border-border/30 px-4 py-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/")}>
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-xl font-black">My Grocery Orders</h1>
                        <p className="text-xs text-muted-foreground">Track & manage your orders</p>
                    </div>
                </div>
            </header>

            <div className="px-4 py-3 overflow-x-auto no-scrollbar">
                <div className="flex gap-2">
                    <button
                        onClick={() => setStatusFilter(null)}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${!statusFilter ? 'bg-primary text-white' : 'bg-muted'
                            }`}
                    >
                        All ({orders?.length || 0})
                    </button>
                    {orderStatuses.map(status => {
                        const count = orders?.filter(o => o.status === status).length || 0;
                        return (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${statusFilter === status ? 'bg-primary text-white' : 'bg-muted'
                                    }`}
                            >
                                {STATUS_CONFIG[status]?.label} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="px-4 space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-muted/30 rounded-2xl p-4 animate-pulse">
                                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                                <div className="h-3 bg-muted rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => {
                        const StatusIcon = getStatusIcon(order.status);
                        const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;

                        return (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-muted/20 rounded-2xl border border-border/30 overflow-hidden shadow-sm"
                            >
                                <div className="p-4 border-b border-border/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-10 h-10 rounded-xl ${statusConfig.bg} flex items-center justify-center`}>
                                                <StatusIcon size={20} className={statusConfig.color} />
                                            </div>
                                            <div>
                                                <p className="font-black text-sm">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                                                <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                                            </div>
                                        </div>
                                        <Badge className={`${statusConfig.bg} ${statusConfig.color} border-none font-black text-[10px]`}>
                                            {statusConfig.label}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex -space-x-2">
                                            {order.items?.slice(0, 3).map((item: any, idx: number) => (
                                                <div key={idx} className="w-12 h-12 rounded-xl bg-muted border-2 border-white dark:border-muted overflow-hidden">
                                                    {item.product?.image_url ? (
                                                        <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                                                    )}
                                                </div>
                                            ))}
                                            {(order.items?.length || 0) > 3 && (
                                                <div className="w-12 h-12 rounded-xl bg-muted border-2 border-white dark:border-muted flex items-center justify-center">
                                                    <span className="text-xs font-black">+{order.items.length - 3}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm line-clamp-1">
                                                {order.items?.map((i: any) => i.name).join(', ')}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{order.items?.length || 0} items</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Total</p>
                                            <p className="text-lg font-black text-primary">PKR {order.total_amount}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                                <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setSelectedOrder(order); setShowTracking(true); }}>
                                                    <Locate size={14} className="mr-1" /> Track
                                                </Button>
                                            )}
                                            <Button size="sm" className="rounded-full" onClick={() => handleReorder(order)}>
                                                <RefreshCw size={14} className="mr-1" /> Reorder
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag size={40} className="text-muted-foreground/50" />
                        </div>
                        <h3 className="font-black text-lg mb-2">No Orders Yet</h3>
                        <p className="text-sm text-muted-foreground mb-6">Start shopping to see your orders here</p>
                        <Button className="rounded-full" onClick={() => navigate("/grocery")}>Start Shopping</Button>
                    </div>
                )}
            </div>

            <Dialog open={showTracking} onOpenChange={setShowTracking}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    {selectedOrder && <OrderTracking order={selectedOrder} onClose={() => setShowTracking(false)} />}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function OrderTracking({ order, onBack, onClose }: { order: any; onBack?: () => void; onClose?: () => void }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: timeline } = useGroceryOrderTimeline(order.id);

    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;

    const steps = [
        { status: 'placed', label: 'Order Placed', description: 'Your order has been received' },
        { status: 'preparing', label: 'Preparing', description: 'Your items are being prepared' },
        { status: 'on_way', label: 'On the Way', description: 'Rider is delivering your order' },
        { status: 'delivered', label: 'Delivered', description: 'Order delivered successfully' },
    ];

    const currentStepIndex = steps.findIndex(s => s.status === order.status);
    const isCancelled = order.status === 'cancelled';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black">Order Tracking</h2>
                    <p className="text-sm text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <Badge className={`${statusConfig.bg} ${statusConfig.color} border-none font-black`}>
                    {statusConfig.label}
                </Badge>
            </div>

            <div className="p-4 bg-muted/30 rounded-2xl">
                <div className="flex items-start gap-3">
                    <MapPin size={20} className="text-primary mt-0.5" />
                    <div>
                        <p className="font-bold text-sm">Delivery Address</p>
                        <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                    </div>
                </div>
            </div>

            {!isCancelled && (
                <div className="relative">
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-muted" />
                    <div className="space-y-6">
                        {steps.map((step, index) => {
                            const isCompleted = index <= currentStepIndex;

                            return (
                                <div key={step.status} className="flex items-start gap-4 relative z-10">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                                        }`}>
                                        {isCompleted ? <CheckCircle2 size={20} /> : <span className="font-black text-xs">{index + 1}</span>}
                                    </div>
                                    <div className="flex-1 pt-1">
                                        <p className={`font-bold ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                                        <p className="text-xs text-muted-foreground">{step.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {isCancelled && (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X size={32} className="text-red-600" />
                    </div>
                    <h3 className="font-black text-lg text-red-600">Order Cancelled</h3>
                </div>
            )}

            <div className="border-t pt-4">
                <h3 className="font-bold mb-3">Order Summary</h3>
                <div className="space-y-2">
                    {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="line-clamp-1">{item.quantity}x {item.name}</span>
                            <span className="font-bold">PKR {item.total_price}</span>
                        </div>
                    ))}
                </div>
                <div className="border-t mt-4 pt-4 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>PKR {order.subtotal}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery</span><span>PKR {order.delivery_fee}</span></div>
                    <div className="flex justify-between font-black text-lg"><span>Total</span><span className="text-primary">PKR {order.total_amount}</span></div>
                </div>
            </div>

            <div className="flex gap-3">
                {onClose && <Button variant="outline" className="flex-1 rounded-full" onClick={onClose}>Close</Button>}
                {onBack && <Button className="flex-1 rounded-full" onClick={onBack}>View All Orders</Button>}
                {order.status === 'delivered' && <Button className="flex-1 rounded-full" onClick={() => navigate('/grocery')}><RefreshCw size={16} className="mr-2" />Reorder</Button>}
            </div>
        </div>
    );
}
