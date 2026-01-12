import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useNotificationSound } from './useNotificationSound';

// Real-time order updates for all dashboards
export const useRealtimeOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playSound, speakNotification } = useNotificationSound();

  useEffect(() => {
    if (!user) return;

    console.log('[Realtime] Starting order subscriptions for user:', user.id);

    // Listen to orders table changes
    const ordersChannel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('[Realtime] Order change detected:', payload.eventType);
          
          // Invalidate all order-related queries
          queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
          queryClient.invalidateQueries({ queryKey: ['business-orders'] });
          queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
          queryClient.invalidateQueries({ queryKey: ['my-active-deliveries'] });
          queryClient.invalidateQueries({ queryKey: ['my-completed-deliveries'] });
          queryClient.invalidateQueries({ queryKey: ['active-orders'] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          
          // Notify on new order
          if (payload.eventType === 'INSERT') {
            playSound();
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Orders subscription active');
        }
        if (err) {
          console.warn('[Realtime] Orders subscription error:', err.message);
        }
      });

    // Listen to rider_requests table changes
    const requestsChannel = supabase
      .channel('rider-requests-realtime-global')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rider_requests',
        },
        (payload) => {
          console.log('[Realtime] Rider request change:', payload.eventType);
          
          queryClient.invalidateQueries({ queryKey: ['admin-rider-requests'] });
          queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
          queryClient.invalidateQueries({ queryKey: ['my-active-deliveries'] });
          queryClient.invalidateQueries({ queryKey: ['my-completed-deliveries'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
          queryClient.invalidateQueries({ queryKey: ['active-orders'] });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Rider requests subscription active');
        }
        if (err) {
          console.warn('[Realtime] Rider requests subscription error:', err.message);
        }
      });

    // Listen to rider_payments table for earnings updates
    const paymentsChannel = supabase
      .channel('rider-payments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rider_payments',
        },
        (payload) => {
          console.log('[Realtime] Rider payment change:', payload.eventType);
          
          // Invalidate all earnings-related queries
          queryClient.invalidateQueries({ queryKey: ['rider-payments'] });
          queryClient.invalidateQueries({ queryKey: ['all-rider-payments'] });
          queryClient.invalidateQueries({ queryKey: ['rider-earnings-summary'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Rider payments subscription active');
        }
        if (err) {
          console.warn('[Realtime] Rider payments subscription error:', err.message);
        }
      });

    // Listen to riders table for location updates
    const ridersChannel = supabase
      .channel('riders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'riders',
        },
        (payload) => {
          console.log('[Realtime] Rider update detected');
          queryClient.invalidateQueries({ queryKey: ['admin-riders'] });
          queryClient.invalidateQueries({ queryKey: ['online-riders'] });
          queryClient.invalidateQueries({ queryKey: ['rider-profile'] });
          // Rider <-> user linkage changes should re-resolve role immediately
          queryClient.invalidateQueries({ queryKey: ['user-role'] });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Riders subscription active');
        }
        if (err) {
          console.warn('[Realtime] Riders subscription error:', err.message);
        }
      });

    return () => {
      console.log('[Realtime] Cleaning up order subscriptions');
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(ridersChannel);
    };
  }, [user, queryClient, playSound]);
};

// Global realtime subscriptions for customer-facing data (businesses, menu items)
// These work for ALL users (authenticated or not) to ensure live updates
export const useRealtimePublicData = () => {
  const queryClient = useQueryClient();
  const subscribedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate subscriptions
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    console.log('[Realtime] Starting public data subscriptions (businesses, menu_items)');

    // Listen to businesses table for all changes
    const businessesChannel = supabase
      .channel('businesses-public-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'businesses',
        },
        (payload) => {
          console.log('[Realtime] Business change detected:', payload.eventType, payload.new);
          
          // Invalidate ALL business-related queries
          queryClient.invalidateQueries({ queryKey: ['businesses'] });
          queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
          queryClient.invalidateQueries({ queryKey: ['featured-businesses'] });
          queryClient.invalidateQueries({ queryKey: ['my-business'] });
          queryClient.invalidateQueries({ queryKey: ['business'] });
          queryClient.invalidateQueries({ queryKey: ['user-role'] });
          queryClient.invalidateQueries({ queryKey: ['business-stats'] });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✓ Businesses subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Businesses subscription failed:', err);
          // Retry after delay
          setTimeout(() => {
            subscribedRef.current = false;
          }, 5000);
        }
        if (err) {
          console.warn('[Realtime] Businesses subscription error:', err.message);
        }
      });

    // Listen to menu_items table for all changes (CRITICAL for menus/categories)
    const menuItemsChannel = supabase
      .channel('menu-items-public-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
        },
        (payload) => {
          console.log('[Realtime] Menu item change detected:', payload.eventType);
          
          // Invalidate ALL menu-related queries
          queryClient.invalidateQueries({ queryKey: ['menu-items'] });
          queryClient.invalidateQueries({ queryKey: ['business-menu'] });
          queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
          queryClient.invalidateQueries({ queryKey: ['business-stats'] });
          
          // Also invalidate specific business menu if we know the business_id
          const businessId = (payload.new as any)?.business_id || (payload.old as any)?.business_id;
          if (businessId) {
            queryClient.invalidateQueries({ queryKey: ['menu-items', businessId] });
            queryClient.invalidateQueries({ queryKey: ['business-menu', businessId] });
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✓ Menu items subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Menu items subscription failed:', err);
        }
        if (err) {
          console.warn('[Realtime] Menu items subscription error:', err.message);
        }
      });

    return () => {
      console.log('[Realtime] Cleaning up public data subscriptions');
      subscribedRef.current = false;
      supabase.removeChannel(businessesChannel);
      supabase.removeChannel(menuItemsChannel);
    };
  }, [queryClient]);
};

// Real-time notifications listener with sound
export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playSound, speakNotification } = useNotificationSound();

  useEffect(() => {
    if (!user) return;

    console.log('[Realtime] Starting notifications subscription for user:', user.id);

    const channel = supabase
      .channel('notifications-sound')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] New notification received:', payload);
          
          // Play sound
          playSound();
          
          // Speak if it's an important notification
          const newNotification = payload.new as { title: string; message: string; type: string };
          if (newNotification.type === 'order' || newNotification.type === 'rider') {
            speakNotification(newNotification.title);
          }
          
          // Show toast
          toast.info(newNotification.title, {
            description: newNotification.message,
            duration: 5000,
          });
          
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-count', user.id] });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✓ Notifications subscription active');
        }
        if (err) {
          console.warn('[Realtime] Notifications subscription error:', err.message);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, playSound, speakNotification]);
};

// Hook for real-time rider location updates (for customers tracking their rider)
export const useRealtimeRiderLocation = (riderId: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!riderId) return;

    console.log('[Realtime] Starting rider location tracking for:', riderId);

    const channel = supabase
      .channel(`rider-location-track-${riderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'riders',
          filter: `id=eq.${riderId}`,
        },
        (payload) => {
          console.log('[Realtime] Rider location updated:', riderId);
          queryClient.invalidateQueries({ queryKey: ['rider-location', riderId] });
          queryClient.invalidateQueries({ queryKey: ['order-rider-location', riderId] });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✓ Rider location subscription active for:', riderId);
        }
        if (err) {
          console.warn('[Realtime] Rider location subscription error:', err.message);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [riderId, queryClient]);
};

// Hook for admin to see live role changes
export const useRealtimeUserRoles = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[Realtime] Starting user roles subscription');

    const channel = supabase
      .channel('user-roles-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
        },
        (payload) => {
          console.log('[Realtime] User role change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['user-role'] });
          queryClient.invalidateQueries({ queryKey: ['is-admin'] });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✓ User roles subscription active');
        }
        if (err) {
          console.warn('[Realtime] User roles subscription error:', err.message);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

export default useRealtimeOrders;
