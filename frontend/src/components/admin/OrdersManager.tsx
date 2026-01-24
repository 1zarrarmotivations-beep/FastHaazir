import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  ShoppingBag,
  Clock,
  MapPin,
  Phone,
  User,
  ChevronDown,
  Check,
  X,
  AlertCircle,
  Bike,
  Store,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageCircle,
  EyeOff
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  useAdminOrders, 
  useAdminRiders, 
  useAcceptOrder,
  useRejectOrder,
  useAssignRiderToOrder,
  useUpdateOrderStatus 
} from "@/hooks/useAdmin";
import { format } from "date-fns";
import AdminChatViewer from "./AdminChatViewer";

const statusConfig = {
  placed: { 
    color: "bg-amber-500/10 text-amber-600 border-amber-500/30", 
    icon: Clock,
    label: "New Order",
    gradient: "from-amber-500 to-orange-500"
  },
  preparing: { 
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30", 
    icon: Package,
    label: "Preparing",
    gradient: "from-blue-500 to-indigo-500"
  },
  on_way: { 
    color: "bg-purple-500/10 text-purple-600 border-purple-500/30", 
    icon: Truck,
    label: "On the Way",
    gradient: "from-purple-500 to-violet-500"
  },
  delivered: { 
    color: "bg-green-500/10 text-green-600 border-green-500/30", 
    icon: CheckCircle,
    label: "Delivered",
    gradient: "from-green-500 to-emerald-500"
  },
  cancelled: { 
    color: "bg-red-500/10 text-red-600 border-red-500/30", 
    icon: XCircle,
    label: "Cancelled",
    gradient: "from-red-500 to-rose-500"
  },
};

export function OrdersManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewingChatOrderId, setViewingChatOrderId] = useState<string | null>(null);
  const [chatOrderInfo, setChatOrderInfo] = useState<{
    customerPhone?: string;
    riderName?: string;
    businessName?: string;
  } | null>(null);

  const { data: orders, isLoading, refetch } = useAdminOrders();
  const { data: riders } = useAdminRiders();
  const acceptOrder = useAcceptOrder();
  const rejectOrder = useRejectOrder();
  const updateStatus = useUpdateOrderStatus();
  const assignRider = useAssignRiderToOrder();

  const filteredOrders = orders?.filter((order) => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.delivery_address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeRiders = riders?.filter(r => r.is_active && r.is_online) || [];

  // Order statistics
  const orderStats = {
    total: orders?.length || 0,
    placed: orders?.filter(o => o.status === 'placed').length || 0,
    preparing: orders?.filter(o => o.status === 'preparing').length || 0,
    onWay: orders?.filter(o => o.status === 'on_way').length || 0,
    delivered: orders?.filter(o => o.status === 'delivered').length || 0,
    cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Command Center Header */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-2 md:col-span-1"
        >
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{orderStats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
        </motion.div>

        {orderStats.placed > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <Card className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/30 h-full overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full m-2 animate-pulse" />
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 mb-1" />
                <p className="text-xl font-bold text-amber-600">{orderStats.placed}</p>
                <p className="text-xs text-muted-foreground">New</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <Package className="w-5 h-5 text-blue-600 mb-1" />
            <p className="text-xl font-bold text-foreground">{orderStats.preparing}</p>
            <p className="text-xs text-muted-foreground">Preparing</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <Truck className="w-5 h-5 text-purple-600 mb-1" />
            <p className="text-xl font-bold text-foreground">{orderStats.onWay}</p>
            <p className="text-xs text-muted-foreground">On Way</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600 mb-1" />
            <p className="text-xl font-bold text-foreground">{orderStats.delivered}</p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <Bike className="w-5 h-5 text-emerald-600 mb-1" />
            <p className="text-xl font-bold text-foreground">{activeRiders.length}</p>
            <p className="text-xs text-muted-foreground">Riders Online</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Alert Banner */}
      <AnimatePresence>
        {orderStats.placed > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white">
                    <div className="relative">
                      <AlertCircle className="w-6 h-6" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{orderStats.placed} New Order{orderStats.placed > 1 ? 's' : ''} Waiting!</p>
                      <p className="text-sm opacity-90">Take action to keep customers happy</p>
                    </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => setStatusFilter('placed')}
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    View Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by order ID or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="placed">🟡 New Orders</SelectItem>
              <SelectItem value="preparing">🔵 Preparing</SelectItem>
              <SelectItem value="on_way">🟣 On the Way</SelectItem>
              <SelectItem value="delivered">🟢 Delivered</SelectItem>
              <SelectItem value="cancelled">🔴 Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredOrders?.map((order, index) => {
              const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.placed;
              const StatusIcon = config.icon;
              const assignedRider = riders?.find(r => r.id === order.rider_id);

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 ${
                    order.status === 'placed' ? 'border-l-amber-500 bg-amber-500/5' : 
                    order.status === 'preparing' ? 'border-l-blue-500' :
                    order.status === 'on_way' ? 'border-l-purple-500' :
                    order.status === 'delivered' ? 'border-l-green-500' : 'border-l-red-500'
                  }`}>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        {/* Order Info */}
                        <div className="flex-1 min-w-0">
                          {/* Header Row */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient}`}>
                                <StatusIcon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-bold text-foreground text-lg">
                                  #{order.id.slice(0, 8).toUpperCase()}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{format(new Date(order.created_at), "MMM d, h:mm a")}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-foreground">
                                PKR {order.total?.toLocaleString()}
                              </p>
                              <Badge className={config.color}>
                                {config.label}
                              </Badge>
                            </div>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                            {/* Customer */}
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                              <User className="w-4 h-4 text-primary mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground font-medium">Customer</p>
                                <p className="text-sm font-medium text-foreground truncate">
                                  {order.customer_phone || 'Unknown'}
                                </p>
                              </div>
                            </div>

                            {/* Business */}
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                              <Store className="w-4 h-4 text-primary mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground font-medium">Business</p>
                                <p className="text-sm font-medium text-foreground truncate">
                                  {(order as any).business?.name || 'N/A'}
                                </p>
                              </div>
                            </div>

                            {/* Address */}
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 md:col-span-2">
                              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground font-medium">Delivery Address</p>
                                <p className="text-sm text-foreground line-clamp-2">
                                  {order.delivery_address || 'No address provided'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Items Summary */}
                          <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                            <p className="text-sm font-medium text-foreground flex items-center gap-2">
                              <Package className="w-4 h-4 text-primary" />
                              {Array.isArray(order.items) ? order.items.length : 0} item(s)
                              {Array.isArray(order.items) && order.items.length > 0 && (
                                <span className="text-muted-foreground">
                                  • {order.items.slice(0, 2).map((item: any) => item.name || item.item_name).join(', ')}
                                  {order.items.length > 2 && ` +${order.items.length - 2} more`}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Assigned Rider */}
                          {assignedRider && (
                            <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                              <Bike className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm font-medium text-emerald-700">
                                Rider: {assignedRider.name}
                              </span>
                              <Badge variant="outline" className="text-xs ml-auto">
                                {assignedRider.vehicle_type}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Action Panel */}
                        <div className="flex flex-col gap-2 lg:w-56 lg:border-l lg:pl-4 lg:ml-2 border-border">
                          {/* Accept/Reject for New Orders */}
                          {order.status === 'placed' && (
                            <div className="flex gap-2 mb-2">
                              <Button
                                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                                size="sm"
                                onClick={() => acceptOrder.mutate(order.id)}
                                disabled={acceptOrder.isPending}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                                onClick={() => rejectOrder.mutate({ orderId: order.id, reason: "Order rejected by admin" })}
                                disabled={rejectOrder.isPending}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}

                          {/* Status Change */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="w-full justify-between">
                                <span className="flex items-center gap-2">
                                  <StatusIcon className="w-4 h-4" />
                                  Update Status
                                </span>
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem 
                                onClick={() => updateStatus.mutate({ orderId: order.id, status: 'placed' })}
                                className="flex items-center gap-2"
                              >
                                <Clock className="w-4 h-4 text-amber-500" />
                                New Order
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateStatus.mutate({ orderId: order.id, status: 'preparing' })}
                                className="flex items-center gap-2"
                              >
                                <Package className="w-4 h-4 text-blue-500" />
                                Preparing
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateStatus.mutate({ orderId: order.id, status: 'on_way' })}
                                className="flex items-center gap-2"
                              >
                                <Truck className="w-4 h-4 text-purple-500" />
                                On the Way
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateStatus.mutate({ orderId: order.id, status: 'delivered' })}
                                className="flex items-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Delivered
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateStatus.mutate({ orderId: order.id, status: 'cancelled' })}
                                className="flex items-center gap-2 text-destructive"
                              >
                                <XCircle className="w-4 h-4" />
                                Cancelled
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Assign Rider */}
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant={order.rider_id ? "outline" : "default"}
                                  className={!order.rider_id ? "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0" : ""}
                                >
                                  <Bike className="w-4 h-4 mr-2" />
                                  {order.rider_id ? "Reassign" : "Assign Rider"}
                                  <ChevronDown className="w-4 h-4 ml-auto" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                {activeRiders.length === 0 ? (
                                  <div className="p-3 text-center">
                                    <Bike className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">No riders online</p>
                                  </div>
                                ) : (
                                  activeRiders.map((rider) => (
                                    <DropdownMenuItem 
                                      key={rider.id}
                                      onClick={() => assignRider.mutate({ orderId: order.id, riderId: rider.id })}
                                      className="flex items-center justify-between"
                                    >
                                      <span className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        {rider.name}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {rider.vehicle_type}
                                      </Badge>
                                    </DropdownMenuItem>
                                  ))
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {filteredOrders?.length === 0 && !isLoading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No orders found</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {statusFilter !== 'all' 
              ? `No ${statusFilter} orders at the moment. Try a different filter.`
              : 'Orders will appear here when customers place them.'}
          </p>
          {statusFilter !== 'all' && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setStatusFilter('all')}
            >
              View All Orders
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
