import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X, Phone, User, Store, Bike, Map, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { 
  useChatMessages, 
  useSendMessage, 
  useOrderParticipants,
  useRiderRequestParticipants 
} from '@/hooks/useChat';
import { format } from 'date-fns';

interface OrderChatProps {
  orderId?: string;
  riderRequestId?: string;
  userType: 'customer' | 'business' | 'rider';
  isOpen: boolean;
  onClose: () => void;
}

// Memoized Mini Map Component - Only renders once per order
const MiniMapPreview = memo(({ 
  pickupAddress, 
  dropoffAddress 
}: { 
  pickupAddress?: string; 
  dropoffAddress?: string; 
}) => {
  return (
    <div className="p-3 bg-muted/30 border-b border-border">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Map className="w-4 h-4" />
        <div className="flex-1 truncate">
          {pickupAddress && <span className="font-medium">From: </span>}
          {pickupAddress || 'Pickup location'}
        </div>
      </div>
      {dropoffAddress && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <div className="w-4" />
          <div className="flex-1 truncate">
            <span className="font-medium">To: </span>
            {dropoffAddress}
          </div>
        </div>
      )}
    </div>
  );
});

MiniMapPreview.displayName = 'MiniMapPreview';

// Message Bubble Component
const MessageBubble = memo(({ 
  msg, 
  isOwnMessage,
  getSenderName,
  getSenderIcon 
}: { 
  msg: any;
  isOwnMessage: boolean;
  getSenderName: (senderType: string, senderId: string) => string;
  getSenderIcon: (senderType: string) => React.ReactNode;
}) => {
  const isCustomerMessage = msg.sender_type === 'customer';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isCustomerMessage ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] ${isCustomerMessage ? 'order-2' : 'order-1'}`}>
        {/* Sender Label */}
        <div className={`flex items-center gap-1 mb-1 ${isCustomerMessage ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-xs font-medium ${isCustomerMessage ? 'text-primary' : 'text-blue-500'}`}>
            {isOwnMessage ? 'You' : getSenderName(msg.sender_type, msg.sender_id)}
          </span>
          {getSenderIcon(msg.sender_type)}
        </div>
        
        {/* Message Bubble */}
        <div
          className={`px-4 py-3 shadow-sm ${
            isCustomerMessage
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
          style={{
            borderRadius: isCustomerMessage 
              ? '18px 18px 4px 18px'
              : '18px 18px 18px 4px'
          }}
        >
          <p className="text-sm leading-relaxed">{msg.message}</p>
          <p className={`text-xs mt-2 ${
            isCustomerMessage 
              ? 'text-primary-foreground/70 text-right' 
              : 'text-muted-foreground text-left'
          }`}>
            {format(new Date(msg.created_at), 'HH:mm')}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

MessageBubble.displayName = 'MessageBubble';

const OrderChat = ({ orderId, riderRequestId, userType, isOpen, onClose }: OrderChatProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [showLocationInfo, setShowLocationInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useChatMessages(orderId, riderRequestId);
  const { data: orderParticipants } = useOrderParticipants(orderId);
  const { data: requestParticipants } = useRiderRequestParticipants(riderRequestId);
  const sendMessage = useSendMessage();

  const participants = orderId ? orderParticipants : requestParticipants;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;

    sendMessage.mutate({
      orderId,
      riderRequestId,
      message,
      senderType: userType,
    }, {
      onSuccess: () => setMessage(''),
    });
  };

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case 'customer':
        return <User className="w-4 h-4" />;
      case 'business':
        return <Store className="w-4 h-4" />;
      case 'rider':
        return <Bike className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getSenderName = (senderType: string, senderId: string) => {
    if (senderId === user?.id) return 'You';
    
    switch (senderType) {
      case 'customer':
        return 'Customer';
      case 'business':
        return (orderParticipants as any)?.business?.name || 'Restaurant';
      case 'rider':
        return participants?.rider?.name || 'Rider';
      default:
        return 'Unknown';
    }
  };

  const getChatTitle = () => {
    if (orderId) {
      const status = orderParticipants?.status;
      if (status === 'placed' || status === 'preparing') {
        return userType === 'customer' ? 'Chat with Restaurant' : 'Chat with Customer';
      }
      if (status === 'on_way') {
        return userType === 'customer' ? 'Chat with Rider' : 'Chat with Customer';
      }
    }
    if (riderRequestId) {
      return userType === 'customer' ? 'Chat with Rider' : 'Chat with Customer';
    }
    return 'Order Chat';
  };

  const getContactInfo = () => {
    if (userType === 'customer') {
      const status = orderParticipants?.status || requestParticipants?.status;
      if (status === 'on_way' && participants?.rider?.phone) {
        return {
          name: participants.rider.name,
          phone: participants.rider.phone,
          type: 'Rider'
        };
      }
      const business = (orderParticipants as any)?.business;
      if ((status === 'placed' || status === 'preparing') && business?.owner_phone) {
        return {
          name: business.name,
          phone: business.owner_phone,
          type: 'Restaurant'
        };
      }
      // For rider requests, always show rider contact
      if (riderRequestId && participants?.rider?.phone) {
        return {
          name: participants.rider.name,
          phone: participants.rider.phone,
          type: 'Rider'
        };
      }
    }
    
    if (userType === 'rider' || userType === 'business') {
      const customerPhone = orderParticipants?.customer_phone || requestParticipants?.customer_phone;
      if (customerPhone) {
        return {
          name: 'Customer',
          phone: customerPhone,
          type: 'Customer'
        };
      }
    }
    
    return null;
  };

  const getLocationInfo = () => {
    if (riderRequestId && requestParticipants) {
      return {
        pickup: requestParticipants.pickup_address,
        dropoff: requestParticipants.dropoff_address,
      };
    }
    if (orderId && orderParticipants) {
      return {
        pickup: orderParticipants.pickup_address,
        dropoff: orderParticipants.delivery_address,
      };
    }
    return null;
  };

  const contactInfo = getContactInfo();
  const locationInfo = getLocationInfo();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col md:inset-auto md:bottom-4 md:right-4 md:w-96 md:h-[500px] md:rounded-xl md:shadow-2xl md:border md:border-border overflow-hidden"
      >
        {/* ==================== SECTION A: HEADER (Fixed) ==================== */}
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between md:rounded-t-xl shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold">{getChatTitle()}</span>
            {contactInfo && (
              <Badge variant="secondary" className="text-xs ml-2">
                {contactInfo.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {contactInfo && (
              <a href={`tel:${contactInfo.phone}`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <Phone className="w-5 h-5" />
                </Button>
              </a>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* ==================== SECTION B: LOCATION INFO (Collapsible, ABOVE chat) ==================== */}
        {locationInfo && (locationInfo.pickup || locationInfo.dropoff) && (
          <div className="shrink-0 border-b border-border">
            <button
              onClick={() => setShowLocationInfo(!showLocationInfo)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Map className="w-4 h-4" />
                {showLocationInfo ? 'Hide Location' : 'Show Location'}
              </span>
              {showLocationInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {showLocationInfo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <MiniMapPreview 
                    pickupAddress={locationInfo.pickup} 
                    dropoffAddress={locationInfo.dropoff} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ==================== SECTION C: CHAT MESSAGES (Scrollable) ==================== */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isOwnMessage={msg.sender_id === user?.id}
                  getSenderName={getSenderName}
                  getSenderIcon={getSenderIcon}
                />
              ))}
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ==================== INPUT BAR (Fixed at bottom) ==================== */}
        <div className="p-4 border-t border-border bg-background md:rounded-b-xl shrink-0">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderChat;
