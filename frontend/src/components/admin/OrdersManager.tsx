import { useState } from "react";
import { motion } from "framer-motion";
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
  UserPlus
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

const statusColors = {
  placed: "bg-blue-500/10 text-blue-600",
  preparing: "bg-amber-500/10 text-amber-600",
  on_way: "bg-purple-500/10 text-purple-600",
  delivered: "bg-accent/10 text-accent",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabels = {
  placed: "Placed",
  preparing: "Preparing",
  on_way: "On the Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function OrdersManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: orders, isLoading } = useAdminOrders();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="placed">Placed</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="on_way">On the Way</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-muted rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders?.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden hover:shadow-card transition-all duration-300">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              Order #{order.id.slice(0, 8)}
                            </h3>
                            <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                              {statusLabels[order.status as keyof typeof statusLabels]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>
                              {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">
                            PKR {order.total?.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Fee: PKR {order.delivery_fee}
                          </p>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="mt-3 flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-muted-foreground">
                          <p className="line-clamp-1">{order.delivery_address || "No address"}</p>
                        </div>
                      </div>

                      {/* Customer */}
                      {order.customer_phone && (
                        <div className="mt-2 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {order.customer_phone}
                          </span>
                        </div>
                      )}

                      {/* Items */}
                      <div className="mt-3">
                        <p className="text-sm font-medium text-foreground">
                          {Array.isArray(order.items) ? order.items.length : 0} items
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:w-48">
                      {/* Status Change */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between">
                            Change Status
                            <ChevronDown className="w-4 h-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem 
                            onClick={() => updateStatus.mutate({ orderId: order.id, status: 'placed' })}
                          >
                            Placed
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateStatus.mutate({ orderId: order.id, status: 'preparing' })}
                          >
                            Preparing
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateStatus.mutate({ orderId: order.id, status: 'on_way' })}
                          >
                            On the Way
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateStatus.mutate({ orderId: order.id, status: 'delivered' })}
                          >
                            Delivered
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateStatus.mutate({ orderId: order.id, status: 'cancelled' })}
                            className="text-destructive"
                          >
                            Cancelled
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Assign Rider */}
                      {order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              <User className="w-4 h-4 mr-2" />
                              {order.rider_id ? "Reassign" : "Assign Rider"}
                              <ChevronDown className="w-4 h-4 ml-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {activeRiders.length === 0 ? (
                              <DropdownMenuItem disabled>
                                No riders online
                              </DropdownMenuItem>
                            ) : (
                              activeRiders.map((rider) => (
                                <DropdownMenuItem 
                                  key={rider.id}
                                  onClick={() => {
                                    assignRider.mutate({ orderId: order.id, riderId: rider.id });
                                  }}
                                >
                                  {rider.name} ({rider.vehicle_type})
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
          ))}
        </div>
      )}

      {filteredOrders?.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No orders found</h3>
          <p className="text-muted-foreground">Orders will appear here when customers place them</p>
        </div>
      )}
    </div>
  );
}
