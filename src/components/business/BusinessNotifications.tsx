import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  Package,
  XCircle,
  AlertTriangle,
  Megaphone,
  Check,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: 'order' | 'cancelled' | 'stock' | 'admin';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export const BusinessNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'order',
      title: 'New Order Received',
      message: 'Order #abc123 - 3 items - PKR 1,250',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      read: false,
    },
    {
      id: '2',
      type: 'order',
      title: 'New Order Received',
      message: 'Order #def456 - 2 items - PKR 850',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      read: false,
    },
    {
      id: '3',
      type: 'cancelled',
      title: 'Order Cancelled',
      message: 'Order #xyz789 was cancelled by customer',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      read: true,
    },
    {
      id: '4',
      type: 'admin',
      title: 'Admin Announcement',
      message: 'Platform maintenance scheduled for tonight at 2 AM',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: '5',
      type: 'stock',
      title: 'Low Stock Alert',
      message: 'Chicken Burger quantity is running low',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      read: true,
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order': return Package;
      case 'cancelled': return XCircle;
      case 'stock': return AlertTriangle;
      case 'admin': return Megaphone;
      default: return Bell;
    }
  };

  const getIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'order': return 'text-accent bg-accent/10';
      case 'cancelled': return 'text-destructive bg-destructive/10';
      case 'stock': return 'text-amber-500 bg-amber-500/10';
      case 'admin': return 'text-primary bg-primary/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-primary">{unreadCount}</Badge>
            )}
          </h2>
          <p className="text-muted-foreground">Stay updated with your business activity</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead} className="gap-2">
            <Check className="h-4 w-4" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <AnimatePresence>
              {notifications.length > 0 ? (
                <div className="divide-y divide-border">
                  {notifications.map((notification, index) => {
                    const Icon = getIcon(notification.type);
                    const iconColor = getIconColor(notification.type);
                    
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 flex items-start gap-4 hover:bg-muted/50 transition-colors ${
                          !notification.read ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className={`p-2 rounded-xl ${iconColor}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                            </div>
                            {!notification.read && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Notifications</h3>
                  <p className="text-muted-foreground">
                    You're all caught up! New notifications will appear here.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
