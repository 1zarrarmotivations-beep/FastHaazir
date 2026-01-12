import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  MessageCircle, 
  Package, 
  Bike, 
  CreditCard, 
  CheckCheck,
  BellOff 
} from 'lucide-react';
import { useNotifications, useMarkAsRead, useMarkAllAsRead, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NotificationsSheet = ({ open, onOpenChange }: NotificationsSheetProps) => {
  const { data: notifications = [], isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order':
        return <Package className="h-5 w-5 text-orange-500" />;
      case 'chat':
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'rider':
        return <Bike className="h-5 w-5 text-green-500" />;
      case 'payment':
        return <CreditCard className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }

    // Navigate based on type
    if (notification.order_id) {
      navigate('/orders');
      onOpenChange(false);
    } else if (notification.rider_request_id) {
      navigate('/orders');
      onOpenChange(false);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllAsRead.isPending}
                className="text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-muted-foreground mt-2">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <BellOff className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No notifications yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                We'll notify you when something happens
              </p>
            </div>
          ) : (
            <div className="divide-y">
              <AnimatePresence>
                {notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors relative ${
                      !notification.is_read ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                    
                    <div className="flex gap-3 pl-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {getIcon(notification.type as Notification['type'])}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          !notification.is_read ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationsSheet;
