import { 
  useRealtimeOrders, 
  useRealtimeNotifications, 
  useRealtimeUserRoles, 
  useRealtimePublicData 
} from '@/hooks/useRealtimeOrders';

interface RealtimeProviderProps {
  children: React.ReactNode;
}

const RealtimeProvider = ({ children }: RealtimeProviderProps) => {
  // CRITICAL: All hooks must be called unconditionally in the same order every render
  // Initialize public data realtime subscriptions for ALL users
  useRealtimePublicData();
  
  // Initialize authenticated user realtime listeners
  // These hooks internally check for user and return early if not authenticated
  useRealtimeOrders();
  useRealtimeNotifications();
  useRealtimeUserRoles();

  return <>{children}</>;
};

export default RealtimeProvider;
