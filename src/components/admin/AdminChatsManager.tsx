import { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MessageCircle,
  User,
  Bike,
  Store,
  Clock,
  Filter,
  ChevronDown,
  Package,
  ShoppingBag,
  EyeOff,
  Play,
  VolumeX,
  CheckCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import AdminChatViewer from "./AdminChatViewer";

interface ConversationSummary {
  id: string;
  type: 'order' | 'request';
  orderId?: string;
  riderRequestId?: string;
  status: string;
  customerPhone?: string;
  riderName?: string;
  businessName?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  messageCount: number;
  hasVoice: boolean;
  createdAt: string;
  total: number;
}

// Hook to fetch all conversations with message counts
const useAdminConversations = () => {
  return useQuery({
    queryKey: ['admin-conversations'],
    queryFn: async () => {
      // Fetch orders with messages
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          customer_phone,
          total,
          created_at,
          business:businesses(name),
          rider:riders(name)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (ordersError) throw ordersError;

      // Fetch rider requests with messages
      const { data: requests, error: requestsError } = await supabase
        .from('rider_requests')
        .select(`
          id,
          status,
          customer_phone,
          total,
          created_at,
          rider:riders(name)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (requestsError) throw requestsError;

      // Get message counts for all orders
      const orderIds = orders?.map(o => o.id) || [];
      const requestIds = requests?.map(r => r.id) || [];

      const { data: orderMessages } = await supabase
        .from('chat_messages')
        .select('order_id, message_type, message, created_at')
        .in('order_id', orderIds.length > 0 ? orderIds : ['none'])
        .order('created_at', { ascending: false });

      const { data: requestMessages } = await supabase
        .from('chat_messages')
        .select('rider_request_id, message_type, message, created_at')
        .in('rider_request_id', requestIds.length > 0 ? requestIds : ['none'])
        .order('created_at', { ascending: false });

      // Group messages by order/request
      const orderMessageMap = new Map<string, { count: number; hasVoice: boolean; lastMessage?: string; lastTime?: string }>();
      const requestMessageMap = new Map<string, { count: number; hasVoice: boolean; lastMessage?: string; lastTime?: string }>();

      orderMessages?.forEach(msg => {
        if (!msg.order_id) return;
        const existing = orderMessageMap.get(msg.order_id) || { count: 0, hasVoice: false };
        existing.count++;
        if (msg.message_type === 'voice') existing.hasVoice = true;
        if (!existing.lastMessage) {
          existing.lastMessage = msg.message;
          existing.lastTime = msg.created_at;
        }
        orderMessageMap.set(msg.order_id, existing);
      });

      requestMessages?.forEach(msg => {
        if (!msg.rider_request_id) return;
        const existing = requestMessageMap.get(msg.rider_request_id) || { count: 0, hasVoice: false };
        existing.count++;
        if (msg.message_type === 'voice') existing.hasVoice = true;
        if (!existing.lastMessage) {
          existing.lastMessage = msg.message;
          existing.lastTime = msg.created_at;
        }
        requestMessageMap.set(msg.rider_request_id, existing);
      });

      // Build conversation summaries
      const conversations: ConversationSummary[] = [];

      orders?.forEach(order => {
        const msgInfo = orderMessageMap.get(order.id);
        conversations.push({
          id: order.id,
          type: 'order',
          orderId: order.id,
          status: order.status,
          customerPhone: order.customer_phone || undefined,
          riderName: (order.rider as any)?.name,
          businessName: (order.business as any)?.name,
          lastMessage: msgInfo?.lastMessage,
          lastMessageTime: msgInfo?.lastTime,
          messageCount: msgInfo?.count || 0,
          hasVoice: msgInfo?.hasVoice || false,
          createdAt: order.created_at,
          total: order.total,
        });
      });

      requests?.forEach(request => {
        const msgInfo = requestMessageMap.get(request.id);
        conversations.push({
          id: request.id,
          type: 'request',
          riderRequestId: request.id,
          status: request.status,
          customerPhone: request.customer_phone || undefined,
          riderName: (request.rider as any)?.name,
          lastMessage: msgInfo?.lastMessage,
          lastMessageTime: msgInfo?.lastTime,
          messageCount: msgInfo?.count || 0,
          hasVoice: msgInfo?.hasVoice || false,
          createdAt: request.created_at,
          total: request.total,
        });
      });

      // Sort by most recent activity
      return conversations.sort((a, b) => {
        const aTime = a.lastMessageTime || a.createdAt;
        const bTime = b.lastMessageTime || b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    },
    refetchInterval: 10000, // Refresh every 10s
  });
};

const statusColors: Record<string, string> = {
  placed: "bg-blue-500/10 text-blue-600",
  preparing: "bg-amber-500/10 text-amber-600",
  on_way: "bg-purple-500/10 text-purple-600",
  delivered: "bg-accent/10 text-accent",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  placed: "Placed",
  preparing: "Preparing",
  on_way: "On the Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Conversation Card Component
const ConversationCard = memo(({ 
  conversation, 
  onViewChat 
}: { 
  conversation: ConversationSummary;
  onViewChat: () => void;
}) => {
  return (
    <Card 
      className="overflow-hidden hover:shadow-card transition-all duration-300 cursor-pointer group"
      onClick={onViewChat}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            conversation.type === 'order' ? 'bg-primary/10' : 'bg-orange-500/10'
          }`}>
            {conversation.type === 'order' ? (
              <ShoppingBag className="w-6 h-6 text-primary" />
            ) : (
              <Package className="w-6 h-6 text-orange-500" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">
                {conversation.type === 'order' ? 'Order' : 'Request'} #{conversation.id.slice(0, 8)}
              </h3>
              <Badge className={statusColors[conversation.status]}>
                {statusLabels[conversation.status] || conversation.status}
              </Badge>
              {conversation.messageCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {conversation.messageCount}
                </Badge>
              )}
              {conversation.hasVoice && (
                <Badge variant="outline" className="gap-1 text-purple-600 border-purple-300">
                  <Play className="w-3 h-3" />
                  Voice
                </Badge>
              )}
            </div>

            {/* Participants */}
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span className="truncate max-w-[100px]">
                  {conversation.customerPhone || 'Customer'}
                </span>
              </div>
              {conversation.riderName && (
                <>
                  <span>↔</span>
                  <div className="flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[100px]">{conversation.riderName}</span>
                  </div>
                </>
              )}
              {conversation.businessName && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Store className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[100px]">{conversation.businessName}</span>
                  </div>
                </>
              )}
            </div>

            {/* Last message preview */}
            {conversation.lastMessage && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
                {conversation.lastMessage}
              </p>
            )}

            {/* Time and total */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {format(new Date(conversation.lastMessageTime || conversation.createdAt), "MMM d, h:mm a")}
              </div>
              <span className="text-sm font-medium text-foreground">
                PKR {conversation.total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* View indicator */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <EyeOff className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ConversationCard.displayName = 'ConversationCard';

// Skeleton loader
const ConversationSkeleton = () => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function AdminChatsManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<'all' | 'order' | 'request'>('all');
  const [statusFilter, setStatusFilter] = useState("all");
  const [showWithMessages, setShowWithMessages] = useState(true);

  const { data: conversations, isLoading } = useAdminConversations();

  // Active chat viewer state
  const [viewingChat, setViewingChat] = useState<{
    orderId?: string;
    riderRequestId?: string;
    orderInfo?: {
      customerLabel?: string;
      riderName?: string;
      businessName?: string;
    };
  } | null>(null);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!conversations) return [];

    return conversations.filter(conv => {
      // Type filter
      if (typeFilter !== 'all' && conv.type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && conv.status !== statusFilter) return false;

      // Message filter
      if (showWithMessages && conv.messageCount === 0) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = conv.id.toLowerCase().includes(query);
        const matchesPhone = conv.customerPhone?.toLowerCase().includes(query);
        const matchesRider = conv.riderName?.toLowerCase().includes(query);
        const matchesBusiness = conv.businessName?.toLowerCase().includes(query);
        return matchesId || matchesPhone || matchesRider || matchesBusiness;
      }

      return true;
    });
  }, [conversations, typeFilter, statusFilter, showWithMessages, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    if (!conversations) return { total: 0, withMessages: 0, withVoice: 0 };
    return {
      total: conversations.length,
      withMessages: conversations.filter(c => c.messageCount > 0).length,
      withVoice: conversations.filter(c => c.hasVoice).length,
    };
  }, [conversations]);

  const handleViewChat = (conv: ConversationSummary) => {
    setViewingChat({
      orderId: conv.orderId,
      riderRequestId: conv.riderRequestId,
      orderInfo: {
        customerLabel: conv.customerPhone || 'Customer',
        riderName: conv.riderName,
        businessName: conv.businessName,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <MessageCircle className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">{stats.withMessages}</p>
            <p className="text-xs text-muted-foreground">Active Conversations</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <Play className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold text-foreground">{stats.withVoice}</p>
            <p className="text-xs text-muted-foreground">With Voice Notes</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <Package className="w-6 h-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, phone, rider, or business..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="order">Orders</SelectItem>
            <SelectItem value="request">Requests</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="placed">Placed</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="on_way">On the Way</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showWithMessages ? "default" : "outline"}
          onClick={() => setShowWithMessages(!showWithMessages)}
          className="gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          {showWithMessages ? "With Messages" : "All"}
        </Button>
      </div>

      {/* Silent Mode Notice */}
      <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
        <EyeOff className="w-5 h-5 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-amber-700">Silent Monitoring Mode</p>
          <p className="text-xs text-amber-600/80">
            You can view all customer ↔ rider conversations without sending messages or alerting participants.
          </p>
        </div>
      </div>

      {/* Conversations List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <ConversationSkeleton key={i} />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filteredConversations.map((conv, index) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.03 }}
              >
                <ConversationCard
                  conversation={conv}
                  onViewChat={() => handleViewChat(conv)}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Empty State */}
      {!isLoading && filteredConversations.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No conversations found</h3>
          <p className="text-muted-foreground">
            {showWithMessages 
              ? "No orders or requests have messages yet." 
              : "Try adjusting your filters."}
          </p>
        </div>
      )}

      {/* Chat Viewer Modal */}
      <AdminChatViewer
        orderId={viewingChat?.orderId}
        riderRequestId={viewingChat?.riderRequestId}
        isOpen={!!viewingChat}
        onClose={() => setViewingChat(null)}
        orderInfo={viewingChat?.orderInfo}
      />
    </div>
  );
}
