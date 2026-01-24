import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import OrderChat from './OrderChat';
import { useChatMessages } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';

interface ChatButtonProps {
  orderId?: string;
  riderRequestId?: string;
  userType: 'customer' | 'business' | 'rider' | 'admin';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const ChatButton = ({ 
  orderId, 
  riderRequestId, 
  userType, 
  variant = 'outline',
  size = 'sm',
  className = ''
}: ChatButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { data: messages = [] } = useChatMessages(orderId, riderRequestId);

  // Count unread messages (messages not from current user that haven't been read)
  const unreadCount = messages.filter(
    msg => msg.sender_id !== user?.id && !msg.read_at
  ).length;

  const isIconOnly = size === 'icon';

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={`relative ${className}`}
      >
        <MessageCircle className={`w-4 h-4 ${!isIconOnly ? 'mr-1' : ''}`} />
        {!isIconOnly && 'Chat'}
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      <OrderChat
        orderId={orderId}
        riderRequestId={riderRequestId}
        userType={userType}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

export default ChatButton;
