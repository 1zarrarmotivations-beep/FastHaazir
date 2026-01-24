import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Search, 
  Package,
  Clock,
  MapPin,
  Phone,
  User,
  ChevronDown,
  ArrowRight,
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
import { useAdminRiderRequests, useUpdateRiderRequestStatus, useAdminRiders, useAssignRiderToRequest } from "@/hooks/useAdmin";
import { format } from "date-fns";
import AdminChatViewer from "./AdminChatViewer";

const statusColors = {
  placed: "bg-blue-500/10 text-blue-600",
  preparing: "bg-amber-500/10 text-amber-600",
  on_way: "bg-purple-500/10 text-purple-600",
  delivered: "bg-accent/10 text-accent",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabels = {
  placed: "Pending",
  preparing: "Accepted",
  on_way: "On the Way",
  delivered: "Completed",
  cancelled: "Cancelled",
};

export function RiderRequestsManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewingChatRequestId, setViewingChatRequestId] = useState<string | null>(null);
  const [chatRequestInfo, setChatRequestInfo] = useState<{
    customerPhone?: string;
    riderName?: string;
  } | null>(null);

  const { data: requests, isLoading } = useAdminRiderRequests();
  const { data: riders } = useAdminRiders();
  const updateStatus = useUpdateRiderRequestStatus();
  const assignRider = useAssignRiderToRequest();

  const filteredRequests = requests?.filter((request) => {
    const matchesSearch = 
      request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.pickup_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.dropoff_address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
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
            placeholder="Search requests..."
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
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="placed">Pending</SelectItem>
            <SelectItem value="preparing">Accepted</SelectItem>
            <SelectItem value="on_way">On the Way</SelectItem>
            <SelectItem value="delivered">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests?.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden hover:shadow-card transition-all duration-300">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Request Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">
                              Request #{request.id.slice(0, 8)}
                            </h3>
                            <Badge className={statusColors[request.status as keyof typeof statusColors]}>
                              {statusLabels[request.status as keyof typeof statusLabels]}
                            </Badge>
                            {request.riders && (
                              <Badge variant="outline" className="gap-1">
                                <User className="w-3 h-3" />
                                {request.riders.name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>
                              {format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">
                            PKR {request.total?.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Locations */}
                      <div className="mt-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Pickup</p>
                            <p className="text-sm text-foreground line-clamp-1">{request.pickup_address}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-3">
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <MapPin className="w-3 h-3 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Dropoff</p>
                            <p className="text-sm text-foreground line-clamp-1">{request.dropoff_address}</p>
                          </div>
                        </div>
                      </div>

                      {/* Item Description */}
                      {request.item_description && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Item Description</p>
                          <p className="text-sm text-foreground">{request.item_description}</p>
                        </div>
                      )}

                      {/* Customer */}
                      {request.customer_phone && (
                        <div className="mt-3 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {request.customer_phone}
                          </span>
                        </div>
                      )}
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
                            onClick={() => updateStatus.mutate({ requestId: request.id, status: 'placed' })}
                          >
                            Pending
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateStatus.mutate({ requestId: request.id, status: 'preparing' })}
                          >
                            Accepted
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateStatus.mutate({ requestId: request.id, status: 'on_way' })}
                          >
                            On the Way
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateStatus.mutate({ requestId: request.id, status: 'delivered' })}
                          >
                            Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateStatus.mutate({ requestId: request.id, status: 'cancelled' })}
                            className="text-destructive"
                          >
                            Cancelled
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Assign Rider */}
                      {request.status !== 'delivered' && request.status !== 'cancelled' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              <User className="w-4 h-4 mr-2" />
                              {request.rider_id ? "Reassign" : "Assign Rider"}
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
                                    assignRider.mutate({ requestId: request.id, riderId: rider.id });
                                  }}
                                >
                                  {rider.name} ({rider.vehicle_type})
                                </DropdownMenuItem>
                              ))
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {/* Silent Chat Monitor Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 bg-slate-100 hover:bg-slate-200 border-slate-300"
                        onClick={() => {
                          const assignedRider = riders?.find(r => r.id === request.rider_id);
                          setViewingChatRequestId(request.id);
                          setChatRequestInfo({
                            customerPhone: request.customer_phone,
                            riderName: assignedRider?.name,
                          });
                        }}
                      >
                        <EyeOff className="w-4 h-4 mr-2 text-slate-600" />
                        <span className="text-slate-700">Monitor Chat</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Admin Chat Viewer (Silent Mode) */}
      <AdminChatViewer
        riderRequestId={viewingChatRequestId || undefined}
        isOpen={!!viewingChatRequestId}
        onClose={() => {
          setViewingChatRequestId(null);
          setChatRequestInfo(null);
        }}
        orderInfo={chatRequestInfo || undefined}
      />

      {filteredRequests?.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No requests found</h3>
          <p className="text-muted-foreground">Rider requests will appear here</p>
        </div>
      )}
    </div>
  );
}
