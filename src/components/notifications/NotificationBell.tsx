import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUnreadCount } from '@/hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationBellProps {
  onClick: () => void;
}

const NotificationBell = ({ onClick }: NotificationBellProps) => {
  const { data: unreadCount = 0 } = useUnreadCount();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="relative"
      aria-label="Notifications"
    >
      <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`} />
      
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center"
          >
            <span className="text-[10px] font-bold text-white px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
};

export default NotificationBell;
