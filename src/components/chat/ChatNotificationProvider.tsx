import { useChatNotifications } from '@/hooks/useChatNotifications';

// This component just sets up the global chat notification listener
const ChatNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  useChatNotifications();
  return <>{children}</>;
};

export default ChatNotificationProvider;
