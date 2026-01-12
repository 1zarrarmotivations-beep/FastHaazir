import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { createNotification } from './useNotifications';

// Distance threshold for "nearby" notification (in km)
const NEARBY_THRESHOLD_KM = 0.5; // 500 meters

// Calculate distance using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface OrderForNotification {
  id: string;
  status: string;
  rider_id: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  customer_id: string | null;
  type?: 'order' | 'rider_request';
}

type DeliveryEventType = 'rider_assigned' | 'on_way' | 'nearby' | 'delivered';

/**
 * Send push notification for delivery events (fallback-safe)
 * This will silently fail if push is not configured
 */
const sendDeliveryPush = async (
  customerId: string,
  eventType: DeliveryEventType,
  orderId?: string,
  riderRequestId?: string,
  riderName?: string
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const response = await supabase.functions.invoke('send-delivery-push', {
      body: {
        customerId,
        eventType,
        orderId,
        riderRequestId,
        riderName,
      },
    });

    if (response.error) {
      console.log('Push notification skipped:', response.error.message);
    } else {
      console.log('Push notification result:', response.data);
    }
  } catch (error) {
    // Silently fail - push is optional
    console.log('Push notification unavailable:', error);
  }
};

/**
 * Hook to monitor delivery status and trigger notifications
 * - Rider assigned
 * - Rider nearby (within 500m)
 * - Order delivered
 */
export const useDeliveryNotifications = (order: OrderForNotification | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const nearbyNotifiedRef = useRef<boolean>(false);
  const riderAssignedNotifiedRef = useRef<string | null>(null);
  const deliveredNotifiedRef = useRef<boolean>(false);
  const previousStatusRef = useRef<string | null>(null);

  // Reset notification flags when order changes
  useEffect(() => {
    if (order?.id) {
      nearbyNotifiedRef.current = false;
      riderAssignedNotifiedRef.current = null;
      deliveredNotifiedRef.current = false;
      previousStatusRef.current = order.status;
    }
  }, [order?.id]);

  // Check for rider nearby
  const checkRiderNearby = useCallback(async () => {
    if (!order || !order.rider_id || !order.delivery_lat || !order.delivery_lng) return;
    if (!user || order.customer_id !== user.id) return;
    if (nearbyNotifiedRef.current) return;
    if (order.status !== 'on_way') return;

    try {
      const { data: rider } = await supabase
        .from('public_rider_info')
        .select('current_location_lat, current_location_lng, name')
        .eq('id', order.rider_id)
        .single();

      if (!rider?.current_location_lat || !rider?.current_location_lng) return;

      const distance = calculateDistance(
        Number(rider.current_location_lat),
        Number(rider.current_location_lng),
        order.delivery_lat,
        order.delivery_lng
      );

      if (distance <= NEARBY_THRESHOLD_KM) {
        nearbyNotifiedRef.current = true;
        
        const notifMessage = `Your rider ${rider.name || ''} is less than 500m away. Get ready to receive your order!`;
        
        // In-app notification
        await createNotification(
          user.id,
          '🏍️ Rider is nearby!',
          notifMessage,
          'rider',
          order.type === 'order' ? order.id : undefined,
          order.type === 'rider_request' ? order.id : undefined
        );

        // Push notification (fallback-safe)
        sendDeliveryPush(
          user.id,
          'nearby',
          order.type === 'order' ? order.id : undefined,
          order.type === 'rider_request' ? order.id : undefined,
          rider.name || undefined
        );
      }
    } catch (error) {
      console.error('Error checking rider proximity:', error);
    }
  }, [order, user]);

  // Monitor status changes via realtime
  useEffect(() => {
    if (!order || !user || order.customer_id !== user.id) return;

    const tableName = order.type === 'rider_request' ? 'rider_requests' : 'orders';
    
    const channel = supabase
      .channel(`delivery-notifications-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter: `id=eq.${order.id}`,
        },
        async (payload) => {
          const updated = payload.new as any;
          const oldStatus = previousStatusRef.current;
          const newStatus = updated.status;
          const newRiderId = updated.rider_id;

          // Rider assigned notification
          if (newRiderId && riderAssignedNotifiedRef.current !== newRiderId) {
            riderAssignedNotifiedRef.current = newRiderId;
            
            // Get rider name
            const { data: rider } = await supabase
              .from('public_rider_info')
              .select('name')
              .eq('id', newRiderId)
              .single();

            const riderName = rider?.name || 'A rider';

            // In-app notification
            await createNotification(
              user.id,
              '🏍️ Rider Assigned!',
              `${riderName} has been assigned to your order and will pick it up soon.`,
              'rider',
              order.type === 'order' ? order.id : undefined,
              order.type === 'rider_request' ? order.id : undefined
            );

            // Push notification (fallback-safe)
            sendDeliveryPush(
              user.id,
              'rider_assigned',
              order.type === 'order' ? order.id : undefined,
              order.type === 'rider_request' ? order.id : undefined,
              riderName
            );
          }

          // Status change notifications
          if (oldStatus !== newStatus) {
            previousStatusRef.current = newStatus;

            // On the way notification
            if (newStatus === 'on_way' && oldStatus !== 'on_way') {
              // In-app notification
              await createNotification(
                user.id,
                '🚀 Order On The Way!',
                'Your rider has picked up the order and is heading to you.',
                'order',
                order.type === 'order' ? order.id : undefined,
                order.type === 'rider_request' ? order.id : undefined
              );

              // Push notification (fallback-safe)
              sendDeliveryPush(
                user.id,
                'on_way',
                order.type === 'order' ? order.id : undefined,
                order.type === 'rider_request' ? order.id : undefined
              );
            }

            // Delivered notification
            if (newStatus === 'delivered' && !deliveredNotifiedRef.current) {
              deliveredNotifiedRef.current = true;

              // In-app notification
              await createNotification(
                user.id,
                '✅ Order Delivered!',
                'Your order has been delivered. Enjoy your meal!',
                'order',
                order.type === 'order' ? order.id : undefined,
                order.type === 'rider_request' ? order.id : undefined
              );

              // Push notification (fallback-safe)
              sendDeliveryPush(
                user.id,
                'delivered',
                order.type === 'order' ? order.id : undefined,
                order.type === 'rider_request' ? order.id : undefined
              );
            }
          }

          // Invalidate queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ['active-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order, user, queryClient]);

  // Monitor rider location for nearby detection
  useEffect(() => {
    if (!order?.rider_id || order.status !== 'on_way') return;
    if (!user || order.customer_id !== user.id) return;

    // Check immediately
    checkRiderNearby();

    // Subscribe to rider location updates
    const channel = supabase
      .channel(`rider-nearby-${order.rider_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'riders',
          filter: `id=eq.${order.rider_id}`,
        },
        () => {
          checkRiderNearby();
        }
      )
      .subscribe();

    // Also poll every 10 seconds as fallback
    const interval = setInterval(checkRiderNearby, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [order?.rider_id, order?.status, checkRiderNearby, user]);

  return {
    nearbyNotified: nearbyNotifiedRef.current,
  };
};

/**
 * Helper to send delivery notifications from backend/admin actions
 * Triggers both in-app and push notifications
 */
export const sendDeliveryNotification = async (
  customerId: string,
  type: DeliveryEventType,
  orderId?: string,
  riderRequestId?: string,
  riderName?: string
) => {
  const notifications = {
    rider_assigned: {
      title: '🏍️ Rider Assigned!',
      message: `${riderName || 'A rider'} has been assigned to your order.`,
    },
    on_way: {
      title: '🚀 Order On The Way!',
      message: 'Your rider has picked up the order and is heading to you.',
    },
    nearby: {
      title: '🏍️ Rider is nearby!',
      message: 'Your rider is less than 500m away. Get ready!',
    },
    delivered: {
      title: '✅ Order Delivered!',
      message: 'Your order has been delivered. Enjoy!',
    },
  };

  const notif = notifications[type];
  
  // In-app notification
  await createNotification(
    customerId,
    notif.title,
    notif.message,
    type === 'rider_assigned' || type === 'nearby' ? 'rider' : 'order',
    orderId,
    riderRequestId
  );

  // Push notification (fallback-safe)
  sendDeliveryPush(customerId, type, orderId, riderRequestId, riderName);
};