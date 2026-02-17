import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
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
  EyeOff,
  ClipboardList,
  History,
  FileText,
  AlertCircle,
  Bike,
  Store,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageCircle,
  Navigation,
  CreditCard,
  ShieldCheck,
  Info
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useAdminOrders,
  useAdminRiders,
  useAcceptOrder,
  useRejectOrder,
  useAssignRiderToOrder,
  useUpdateOrderStatus,
  useOrderTimeline,
  useConfirmOrderPayment
} from "@/hooks/useAdmin";
import { format } from "date-fns";
import AdminChatViewer from "./AdminChatViewer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { safeLower } from "@/lib/utils";

export function OrdersManager() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewingChatOrderId, setViewingChatOrderId] = useState<string | null>(null);
  const [chatOrderInfo, setChatOrderInfo] = useState<{
    customerLabel?: string;
    riderName?: string;
    businessName?: string;
  } | null>(null);
  const [viewingTimelineOrderId, setViewingTimelineOrderId] = useState<string | null>(null);

  const { data: timeline } = useOrderTimeline(viewingTimelineOrderId || undefined);

  const statusConfig = {
    placed: {
      color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
      icon: Clock,
      label: t('orderStatus.placed'),
      gradient: "from-amber-500 to-orange-500"
    },
    preparing: {
      color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
      icon: Package,
      label: t('orderStatus.preparing'),
      gradient: "from-blue-500 to-indigo-500"
    },
    on_way: {
      color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
      icon: Truck,
      label: t('orderStatus.onTheWay'),
      gradient: "from-purple-500 to-violet-500"
    },
    delivered: {
      color: "bg-green-500/10 text-green-600 border-green-500/30",
      icon: CheckCircle,
      label: t('orderStatus.delivered'),
      gradient: "from-green-500 to-emerald-500"
    },
    cancelled: {
      color: "bg-red-500/10 text-red-600 border-red-500/30",
      icon: XCircle,
      label: t('orderStatus.cancelled'),
      gradient: "from-red-500 to-rose-500"
    },
  };

  const { data: orders, isLoading, refetch } = useAdminOrders();
  const { data: riders } = useAdminRiders();
  const acceptOrder = useAcceptOrder();
  const rejectOrder = useRejectOrder();
  const updateStatus = useUpdateOrderStatus();
  const assignRider = useAssignRiderToOrder();
  const confirmPayment = useConfirmOrderPayment();

  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const filteredOrders = (orders as any[])?.filter((order: any) => {
    const matchesSearch =
      safeLower(order.id).includes(safeLower(searchQuery)) ||
      safeLower(order.delivery_address).includes(safeLower(searchQuery)) ||
      safeLower(order.customer?.name).includes(safeLower(searchQuery)) ||
      safeLower(order.customer?.phone).includes(safeLower(searchQuery));

    const hasClaimedPayment = order.payments?.some((p: any) =>
      p.payment_status === 'claimed' || p.payment_status === 'waiting_approval'
    );

    if (statusFilter === "claimed_payment") {
      return matchesSearch && hasClaimedPayment;
    }

    const matchesStatus = statusFilter === "all" ? true : order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeRiders = (riders as any[])?.filter(r => r.is_active && r.is_online) || [];

  // Order statistics
  const orderStats = {
    total: orders?.length || 0,
    placed: (orders as any[])?.filter(o => o.status === 'placed').length || 0,
    preparing: (orders as any[])?.filter(o => o.status === 'preparing').length || 0,
    onWay: (orders as any[])?.filter(o => o.status === 'on_way').length || 0,
    delivered: (orders as any[])?.filter(o => o.status === 'delivered').length || 0,
    cancelled: (orders as any[])?.filter(o => o.status === 'cancelled').length || 0,
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
              <SelectItem value="claimed_payment">💰 Claimed Payments</SelectItem>
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
            {filteredOrders?.map((order: any, index) => {
              const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.placed;
              const StatusIcon = config.icon;
              const assignedRider = (riders as any[])?.find(r => r.id === order.rider_id);

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 ${order.status === 'placed' ? 'border-l-amber-500 bg-amber-500/5' :
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
                                  {order.customer?.name || `Customer #${order.id.slice(0, 6)}`}
                                </p>
                                {order.customer?.phone && (
                                  <a
                                    href={`tel:${order.customer.phone}`}
                                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                                  >
                                    <Phone className="w-3 h-3" />
                                    {order.customer.phone}
                                  </a>
                                )}
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

                          {/* Payment Status */}
                          {order.payments && order.payments.length > 0 && (
                            <div className={`mt-3 p-3 rounded-lg border flex items-center justify-between ${order.payments[0].payment_status === 'paid' ? 'bg-green-500/5 border-green-500/20' :
                              (order.payments[0].payment_status === 'claimed' || order.payments[0].payment_status === 'waiting_approval') ? 'bg-amber-500/10 border-amber-500/30 animate-pulse' : 'bg-slate-100 border-slate-200'
                              }`}>
                              <div className="flex items-center gap-2">
                                <CreditCard className={`w-4 h-4 ${order.payments[0].payment_status === 'paid' ? 'text-green-600' : 'text-slate-500'}`} />
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-foreground">
                                    Payment: {(order.payments[0].payment_status === 'waiting_approval' ? 'CLAIMED' : order.payments[0].payment_status?.toUpperCase())}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    Method: {order.payments[0].payment_method} • Amt: PKR {order.payments[0].amount}
                                  </span>
                                </div>
                              </div>
                              {order.payments[0].payment_status !== 'paid' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setAdminNotes(order.status === 'cancelled' ? "Restored from cancelled state after payment verification. " : "");
                                    setConfirmingPaymentId(order.payments[0].id);
                                  }}
                                  className={`h-8 text-xs gap-1 ${order.status === 'cancelled' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-primary hover:bg-primary/90'}`}
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  {order.status === 'cancelled' ? 'Restore & Confirm' : 'Confirm Manually'}
                                </Button>
                              )}
                              {order.payments[0].payment_status === 'paid' && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <Check className="w-4 h-4" />
                                  <span className="text-xs font-bold uppercase">Verified</span>
                                </div>
                              )}
                            </div>
                          )}

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
                            <div className="mt-3 flex flex-col gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                              <div className="flex items-center gap-2">
                                <Bike className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm font-medium text-emerald-700">
                                  Rider: {assignedRider.name}
                                </span>
                                <Badge variant="outline" className="text-xs ml-auto">
                                  {assignedRider.vehicle_type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Navigation className="w-3 h-3 text-emerald-500" />
                                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                                  {order.status === 'preparing' ? "Heading to Pickup" :
                                    order.status === 'on_way' ? "Heading to Customer" :
                                      order.status === 'delivered' ? "Delivered" : "Waiting"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Panel */}
                        <div className="flex flex-col gap-2 lg:w-56 lg:border-l lg:pl-4 lg:ml-2 border-border">
                          {/* Accept/Reject for New Orders */}
                          {/* Accept/Reject for New Orders */}
                          {order.status === 'placed' && (
                            <div className="flex flex-col gap-2 mb-2">
                              {order.payments?.[0]?.payment_method === 'payup_qr' && order.payments?.[0]?.payment_status !== 'paid' ? (
                                <Button
                                  className="w-full bg-gradient-to-r from-primary to-primary/80 text-white shadow-md animate-pulse"
                                  size="sm"
                                  onClick={() => setConfirmingPaymentId(order.payments[0].id)}
                                >
                                  <ShieldCheck className="w-4 h-4 mr-1" />
                                  Verify Payment First
                                </Button>
                              ) : (
                                <Button
                                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                                  size="sm"
                                  onClick={() => acceptOrder.mutate(order.id)}
                                  disabled={acceptOrder.isPending}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Accept Order
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => setRejectingOrderId(order.id)}
                                disabled={rejectOrder.isPending}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}

                          {/* Restore for Cancelled Orders */}
                          {order.status === 'cancelled' && order.payments?.[0] &&
                            (order.payments[0].payment_status === 'claimed' || order.payments[0].payment_status === 'waiting_approval') && (
                              <div className="mb-2">
                                <Button
                                  className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-md"
                                  size="sm"
                                  onClick={() => {
                                    setAdminNotes("Restoring order after customer payment claim verification.");
                                    setConfirmingPaymentId(order.payments[0].id);
                                  }}
                                >
                                  <RefreshCw className="w-4 h-4 mr-1" />
                                  Restore & Confirm
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

                          {/* Silent Chat Monitor Button */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 mt-2 bg-slate-50 hover:bg-slate-100 border-slate-200"
                              onClick={() => {
                                setViewingChatOrderId(order.id);
                                setChatOrderInfo({
                                  customerLabel: `Customer #${order.id.slice(0, 6)}`,
                                  riderName: assignedRider?.name,
                                  businessName: (order as any).business?.name,
                                });
                              }}
                            >
                              <EyeOff className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              <span className="text-slate-600 text-xs">Chat</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 mt-2 bg-slate-50 hover:bg-slate-100 border-slate-200"
                              onClick={() => setViewingTimelineOrderId(order.id)}
                            >
                              <History className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              <span className="text-slate-600 text-xs">History</span>
                            </Button>
                          </div>
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

      {/* Order Timeline Sheet */}
      <Sheet open={!!viewingTimelineOrderId} onOpenChange={() => setViewingTimelineOrderId(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Order Timeline
            </SheetTitle>
            <SheetDescription>
              A history of all status changes for order #{viewingTimelineOrderId?.slice(0, 8).toUpperCase()}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-180px)] pr-4 mt-6">
            <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted">
              {timeline && timeline.length > 0 ? (
                timeline.map((log: any, idx) => (
                  <div key={log.id} className="relative">
                    <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-background ${idx === timeline.length - 1 ? 'bg-primary' : 'bg-muted-foreground'
                      }`}>
                      {idx === timeline.length - 1 && (
                        <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-25" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs uppercase font-bold tracking-tight">
                          {log.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(log.created_at), "h:mm:ss a, MMM d")}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-sm text-foreground bg-muted/30 p-2 rounded-md border border-muted/50">
                          {log.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-muted-foreground text-sm">No activity logs yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Admin Chat Viewer (Silent Mode) */}
      <AdminChatViewer
        orderId={viewingChatOrderId || undefined}
        isOpen={!!viewingChatOrderId}
        onClose={() => {
          setViewingChatOrderId(null);
          setChatOrderInfo(null);
        }}
        orderInfo={chatOrderInfo || undefined}
      />

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
      {/* Manual Payment Confirmation Dialog */}
      <Dialog open={!!confirmingPaymentId} onOpenChange={(open) => !open && setConfirmingPaymentId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Manual Payment Approval
            </DialogTitle>
            <DialogDescription>
              Mark this payment as PAID. Only do this if you have verified the transaction in your bank account or payment processor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                Confirming manually will move the order to "Preparing" status and notify the customer. This action is recorded in the audit logs.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Admin Notes</label>
              <Textarea
                placeholder="Enter transaction reference or reason for manual approval..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmingPaymentId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              disabled={confirmPayment.isPending}
              onClick={() => {
                if (confirmingPaymentId) {
                  confirmPayment.mutate({
                    paymentId: confirmingPaymentId,
                    notes: adminNotes
                  }, {
                    onSuccess: () => {
                      setConfirmingPaymentId(null);
                      setAdminNotes("");
                    }
                  });
                }
              }}
            >
              {confirmPayment.isPending ? "Confirming..." : "Approve Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={!!rejectingOrderId} onOpenChange={(open) => !open && setRejectingOrderId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Order Rejection Reason
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this order. The customer will see this message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Rejection Reason</label>
              <Textarea
                placeholder="e.g. Items out of stock, Outside delivery area, Payment not verified..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectingOrderId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={rejectOrder.isPending}
              onClick={() => {
                if (rejectingOrderId) {
                  rejectOrder.mutate({
                    orderId: rejectingOrderId,
                    reason: rejectionReason
                  }, {
                    onSuccess: () => {
                      setRejectingOrderId(null);
                      setRejectionReason("");
                    }
                  });
                }
              }}
            >
              {rejectOrder.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
