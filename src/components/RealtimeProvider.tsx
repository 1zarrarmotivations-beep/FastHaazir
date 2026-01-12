import { useRealtimeOrders, useRealtimeNotifications, useRealtimeUserRoles, useRealtimePublicData } from '@/hooks/useRealtimeOrders';
import { useAuth } from '@/hooks/useAuth';

interface RealtimeProviderProps {
  children: React.ReactNode;
}

const RealtimeProvider = ({ children }: RealtimeProviderProps) => {
  const { user } = useAuth();
  
  // CRITICAL: Initialize public data realtime subscriptions for ALL users
  // This ensures businesses and menu items update live on customer-facing pages
  useRealtimePublicData();
  
  // Initialize authenticated user realtime listeners
  useRealtimeOrders();
  useRealtimeNotifications();
  useRealtimeUserRoles();

  return <>{children}</>;
};

export default RealtimeProvider;
