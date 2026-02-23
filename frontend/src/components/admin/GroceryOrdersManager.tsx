import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShoppingBag,
    Clock,
    MapPin,
    User,
    Bike,
    Package,
    Truck,
    CheckCircle,
    XCircle,
    Search,
    RefreshCw,
    Phone,
    ChevronDown
} from "lucide-react";
import { useGroceryOrders, useUpdateGroceryOrderStatus } from "@/hooks/useGroceryAdmin";
import { useAdminRiders } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function GroceryOrdersManager() {
    const [searchQuery, setSearchQuery] = useState("");
    const { data: orders, isLoading, refetch } = useGroceryOrders();
    const { data: riders } = useAdminRiders();
    const updateStatus = useUpdateGroceryOrderStatus();

    const statusConfig = {
        pending: { color: "bg-amber-500/10 text-amber-600 border-amber-500/30", icon: Clock, label: "Pending" },
        preparing: { color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: Package, label: "Preparing" },
        on_way: { color: "bg-purple-500/10 text-purple-600 border-purple-500/30", icon: Truck, label: "Out for Delivery" },
        delivered: { color: "bg-green-500/10 text-green-600 border-green-500/30", icon: CheckCircle, label: "Delivered" },
        cancelled: { color: "bg-red-500/10 text-red-600 border-red-500/30", icon: XCircle, label: "Cancelled" },
    };

    const filteredOrders = orders?.filter(o =>
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.delivery_address?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const assignRider = async (orderId: string, riderId: string) => {
        try {
            const { error } = await supabase
                .from("grocery_orders")
                .update({ rider_id: riderId, status: 'preparing' })
                .eq("id", orderId);
            if (error) throw error;
            toast.success("Rider assigned");
            refetch();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search grocery orders..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            <div className="space-y-4">
                {filteredOrders?.map((order) => {
                    const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = config.icon;

                    return (
                        <Card key={order.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: order.status === 'pending' ? '#f59e0b' : '#3b82f6' }}>
                            <CardContent className="p-6">
                                <div className="flex flex-col lg:flex-row justify-between gap-6">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${config.color.split(' ')[0]}`}>
                                                    <StatusIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg leading-none">Order #{order.id.slice(0, 8).toUpperCase()}</h3>
                                                    <p className="text-sm text-textSecondary mt-1">{format(new Date(order.created_at), "MMM d, h:mm a")}</p>
                                                </div>
                                            </div>
                                            <Badge className={config.color}>{config.label}</Badge>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-lg">
                                                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                <p className="text-sm line-clamp-2">{order.delivery_address}</p>
                                            </div>
                                            <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-lg">
                                                <User className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium">Customer</p>
                                                    <p className="text-xs text-textSecondary">ID: {order.customer_id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-primary/5 rounded-xl border border-primary/10 p-4">
                                            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                                                <ShoppingBag size={14} className="text-primary" />
                                                Items Breakdown
                                            </h4>
                                            <div className="space-y-2">
                                                {order.items?.map((item: any) => (
                                                    <div key={item.id} className="flex justify-between items-center text-sm border-b border-primary/5 pb-2 last:border-0 last:pb-0">
                                                        <div>
                                                            <span className="font-bold">{item.product?.name}</span>
                                                            <span className="text-textSecondary ml-2 italic">
                                                                ({item.quantity} {item.product?.pricing_type === 'per_kg' ? 'KG' : 'PCS'})
                                                            </span>
                                                        </div>
                                                        <span className="font-mono font-bold">PKR {item.subtotal}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-primary/20 flex justify-between items-end font-black">
                                                <div className="text-xs text-textSecondary uppercase tracking-widest">Total Weight: {order.items?.reduce((acc: number, item: any) => acc + (item.product?.pricing_type === 'per_kg' ? item.quantity : 0), 0).toFixed(2)} KG</div>
                                                <div className="text-xl text-primary">PKR {order.total_amount}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:w-64 space-y-3">
                                        <div className="p-3 bg-surface rounded-xl border border-border shadow-sm">
                                            <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold mb-2">Rider Assignment</p>
                                            {order.rider ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <Bike size={14} className="text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold">{order.rider.name}</p>
                                                        <p className="text-[10px] text-success font-bold uppercase tracking-wider">Assigned</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button className="w-full bg-primary hover:bg-primary/90 text-white" size="sm">
                                                            Assign Rider
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="w-56">
                                                        {(riders as any[])?.filter(r => r.is_active && r.is_online).map(rider => (
                                                            <DropdownMenuItem key={rider.id} onClick={() => assignRider(order.id, rider.id)}>
                                                                {rider.name}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold px-1">Actions</p>
                                            <Select
                                                value={order.status}
                                                onValueChange={(val) => updateStatus.mutate({ orderId: order.id, status: val })}
                                            >
                                                <SelectTrigger className="w-full h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pending">Mark Pending</SelectItem>
                                                    <SelectItem value="preparing">Start Preparing</SelectItem>
                                                    <SelectItem value="on_way">Ship Order</SelectItem>
                                                    <SelectItem value="delivered">Mark Delivered</SelectItem>
                                                    <SelectItem value="cancelled">Cancel Order</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Button variant="outline" className="w-full h-9 text-xs" onClick={() => window.print()}>
                                                Print Invoice
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
