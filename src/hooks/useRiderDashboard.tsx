import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { createNotification } from "./useNotifications";
export type OrderStatus = 'placed' | 'preparing' | 'on_way' | 'delivered' | 'cancelled';

export interface RiderRequest {
  id: string;
  type?: 'rider_request' | 'order';
  customer_id: string | null;
  customer_phone: string | null;
  rider_id: string | null;
  status: OrderStatus;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  item_description: string | null;
  item_image?: string | null;
  total: number;
  created_at: string;
  updated_at: string;
  business_name?: string;
  items?: any[];
}

export interface RiderProfile {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  vehicle_type: string | null;
  rating: number | null;
  total_trips: number | null;
  is_online: boolean | null;
  is_active: boolean | null;
  image: string | null;
  current_location_lat: number | null;
  current_location_lng: number | null;
}

export const useRiderProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['rider-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('riders')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching rider profile:', error);
        throw error;
      }

      return data as RiderProfile | null;
    },
    enabled: !!user,
  });
};

// Interface for business orders shown to riders
export interface BusinessOrder {
  id: string;
  type: 'order';
  customer_id: string | null;
  customer_phone: string | null;
  rider_id: string | null;
  status: OrderStatus;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  item_description: string | null;
  total: number;
  created_at: string;
  updated_at: string;
  business_name?: string;
  items?: any[];
}

export const usePendingRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-requests'],
    queryFn: async () => {
      // Fetch direct rider requests
      const { data: riderRequests, error: riderError } = await supabase
        .from('rider_requests')
        .select('*')
        .eq('status', 'placed')
        .is('rider_id', null)
        .order('created_at', { ascending: false });

      if (riderError) {
        console.error('Error fetching rider requests:', riderError);
      }

      // Fetch business orders that need a rider
      const { data: businessOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*, businesses(name)')
        .in('status', ['placed', 'preparing'])
        .is('rider_id', null)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching business orders:', ordersError);
      }

      // Transform rider requests
      const formattedRiderRequests: RiderRequest[] = (riderRequests || []).map(req => ({
        ...req,
        type: 'rider_request' as const,
      }));

      // Transform business orders to match RiderRequest interface
      const formattedBusinessOrders: RiderRequest[] = (businessOrders || []).map(order => ({
        id: order.id,
        type: 'order' as const,
        customer_id: order.customer_id,
        customer_phone: order.customer_phone,
        rider_id: order.rider_id,
        status: order.status,
        pickup_address: order.pickup_address || (order.businesses as any)?.name || 'Business',
        dropoff_address: order.delivery_address || 'Customer Location',
        pickup_lat: order.pickup_lat,
        pickup_lng: order.pickup_lng,
        dropoff_lat: order.delivery_lat,
        dropoff_lng: order.delivery_lng,
        item_description: Array.isArray(order.items) ? `${order.items.length} item(s) from ${(order.businesses as any)?.name || 'Business'}` : 'Food Order',
        item_image: null,
        total: order.total,
        created_at: order.created_at,
        updated_at: order.updated_at,
        business_name: (order.businesses as any)?.name,
        items: Array.isArray(order.items) ? order.items : [],
      }));

      // Combine and sort by created_at
      const allRequests = [...formattedRiderRequests, ...formattedBusinessOrders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('Pending requests:', allRequests.length, 'rider requests:', formattedRiderRequests.length, 'business orders:', formattedBusinessOrders.length);

      return allRequests;
    },
    enabled: !!user,
    refetchInterval: 5000, // Refresh every 5 seconds for faster updates
  });
};

export const useMyActiveDeliveries = () => {
  const { user } = useAuth();
  const { data: riderProfile } = useRiderProfile();

  return useQuery({
    queryKey: ['my-active-deliveries', riderProfile?.id],
    queryFn: async () => {
      if (!riderProfile) return [];

      // Fetch rider requests
      const { data: riderRequests, error: riderError } = await supabase
        .from('rider_requests')
        .select('*')
        .eq('rider_id', riderProfile.id)
        .in('status', ['placed', 'preparing', 'on_way'])
        .order('created_at', { ascending: false });

      if (riderError) {
        console.error('Error fetching active rider requests:', riderError);
      }

      // Fetch business orders assigned to this rider
      const { data: businessOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*, businesses(name)')
        .eq('rider_id', riderProfile.id)
        .in('status', ['placed', 'preparing', 'on_way'])
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching active business orders:', ordersError);
      }

      // Transform rider requests
      const formattedRiderRequests: RiderRequest[] = (riderRequests || []).map(req => ({
        ...req,
        type: 'rider_request' as const,
      }));

      // Transform business orders
      const formattedBusinessOrders: RiderRequest[] = (businessOrders || []).map(order => ({
        id: order.id,
        type: 'order' as const,
        customer_id: order.customer_id,
        customer_phone: order.customer_phone,
        rider_id: order.rider_id,
        status: order.status,
        pickup_address: order.pickup_address || (order.businesses as any)?.name || 'Business',
        dropoff_address: order.delivery_address || 'Customer Location',
        pickup_lat: order.pickup_lat,
        pickup_lng: order.pickup_lng,
        dropoff_lat: order.delivery_lat,
        dropoff_lng: order.delivery_lng,
        item_description: Array.isArray(order.items) ? `${order.items.length} item(s) from ${(order.businesses as any)?.name || 'Business'}` : 'Food Order',
        item_image: null,
        total: order.total,
        created_at: order.created_at,
        updated_at: order.updated_at,
        business_name: (order.businesses as any)?.name,
        items: Array.isArray(order.items) ? order.items : [],
      }));

      // Combine and sort
      const allDeliveries = [...formattedRiderRequests, ...formattedBusinessOrders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return allDeliveries;
    },
    enabled: !!user && !!riderProfile,
    refetchInterval: 5000,
  });
};

export const useMyCompletedDeliveries = () => {
  const { user } = useAuth();
  const { data: riderProfile } = useRiderProfile();

  return useQuery({
    queryKey: ['my-completed-deliveries', riderProfile?.id],
    queryFn: async () => {
      if (!riderProfile) return [];

      // Fetch completed rider requests
      const { data: riderRequests, error: riderError } = await supabase
        .from('rider_requests')
        .select('*')
        .eq('rider_id', riderProfile.id)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false })
        .limit(20);

      if (riderError) {
        console.error('Error fetching completed rider requests:', riderError);
      }

      // Fetch completed business orders
      const { data: businessOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*, businesses(name)')
        .eq('rider_id', riderProfile.id)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false })
        .limit(20);

      if (ordersError) {
        console.error('Error fetching completed business orders:', ordersError);
      }

      // Transform rider requests
      const formattedRiderRequests: RiderRequest[] = (riderRequests || []).map(req => ({
        ...req,
        type: 'rider_request' as const,
      }));

      // Transform business orders
      const formattedBusinessOrders: RiderRequest[] = (businessOrders || []).map(order => ({
        id: order.id,
        type: 'order' as const,
        customer_id: order.customer_id,
        customer_phone: order.customer_phone,
        rider_id: order.rider_id,
        status: order.status,
        pickup_address: order.pickup_address || (order.businesses as any)?.name || 'Business',
        dropoff_address: order.delivery_address || 'Customer Location',
        pickup_lat: order.pickup_lat,
        pickup_lng: order.pickup_lng,
        dropoff_lat: order.delivery_lat,
        dropoff_lng: order.delivery_lng,
        item_description: Array.isArray(order.items) ? `${order.items.length} item(s) from ${(order.businesses as any)?.name || 'Business'}` : 'Food Order',
        item_image: null,
        total: order.total,
        created_at: order.created_at,
        updated_at: order.updated_at,
        business_name: (order.businesses as any)?.name,
        items: Array.isArray(order.items) ? order.items : [],
      }));

      // Combine and sort
      const allDeliveries = [...formattedRiderRequests, ...formattedBusinessOrders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 20);

      return allDeliveries;
    },
    enabled: !!user && !!riderProfile,
  });
};

export const useAcceptRequest = () => {
  const queryClient = useQueryClient();
  const { data: riderProfile } = useRiderProfile();

  return useMutation({
    mutationFn: async ({ requestId, requestType }: { requestId: string; requestType: 'rider_request' | 'order' }) => {
      if (!riderProfile) throw new Error('Rider profile not found');

      let customerLat: number | null = null;
      let customerLng: number | null = null;
      let customerId: string | null = null;

      if (requestType === 'order') {
        // Handle business order - First-Accept-Wins logic
        // Check if order is still available (no rider assigned)
        const { data: order, error: checkError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', requestId)
          .is('rider_id', null)
          .in('status', ['placed', 'preparing'])
          .single();

        if (checkError || !order) {
          throw new Error('This order has already been accepted by another rider');
        }

        // Try to claim the order atomically
        const { data, error } = await supabase
          .from('orders')
          .update({ 
            rider_id: riderProfile.id,
            status: 'on_way'
          })
          .eq('id', requestId)
          .is('rider_id', null) // Ensure no one else claimed it
          .select()
          .single();

        if (error || !data) {
          console.error('Error accepting order:', error);
          throw new Error('This order has already been accepted by another rider');
        }

        customerLat = order.delivery_lat;
        customerLng = order.delivery_lng;
        customerId = order.customer_id;

        // Create notification for customer
        if (customerId) {
          await createNotification(
            customerId,
            '🎉 Rider Assigned!',
            `${riderProfile.name} is on the way with your order`,
            'order',
            requestId,
            undefined
          );
        }

        return data;
      } else {
        // Handle rider request - First-Accept-Wins with atomic update
        // Check if request is still available (no rider assigned)
        const { data: request, error: checkError } = await supabase
          .from('rider_requests')
          .select('*')
          .eq('id', requestId)
          .eq('status', 'placed')
          .is('rider_id', null)
          .single();

        if (checkError || !request) {
          throw new Error('This request has already been accepted by another rider');
        }

        // Try to claim the request atomically
        const { data, error } = await supabase
          .from('rider_requests')
          .update({ 
            rider_id: riderProfile.id,
            status: 'preparing'
          })
          .eq('id', requestId)
          .eq('status', 'placed')
          .is('rider_id', null) // Ensure no one else claimed it
          .select()
          .single();

        if (error || !data) {
          console.error('Error accepting request:', error);
          throw new Error('This request has already been accepted by another rider');
        }

        customerLat = request.dropoff_lat;
        customerLng = request.dropoff_lng;
        customerId = request.customer_id;

        // Create notification for customer
        if (customerId) {
          await createNotification(
            customerId,
            '🎉 Rider Assigned!',
            `${riderProfile.name} has been assigned to your delivery`,
            'rider',
            undefined,
            requestId
          );
        }

        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-active-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['rider-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['business-orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
    },
    onError: (error) => {
      // Refresh pending requests to remove already-claimed ones
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
    },
  });
};

export const useUpdateDeliveryStatus = () => {
  const queryClient = useQueryClient();
  const { data: riderProfile } = useRiderProfile();

  return useMutation({
    mutationFn: async ({ requestId, status, requestType }: { requestId: string; status: OrderStatus; requestType?: 'rider_request' | 'order' }) => {
      if (!riderProfile) throw new Error('Rider profile not found');

      let customerId: string | null = null;

      // Try to determine type if not provided
      const type = requestType || 'rider_request';

      if (type === 'order') {
        // Update business order
        const { data: order } = await supabase
          .from('orders')
          .select('customer_id')
          .eq('id', requestId)
          .single();

        customerId = order?.customer_id || null;

        const { data, error } = await supabase
          .from('orders')
          .update({ status })
          .eq('id', requestId)
          .eq('rider_id', riderProfile.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating order status:', error);
          throw error;
        }

        // Create notification for customer
        if (customerId) {
          let title = '';
          let message = '';
          
          switch (status) {
            case 'on_way':
              title = '🚀 Your Order is On The Way!';
              message = 'Your rider is delivering your order';
              break;
            case 'delivered':
              title = '✅ Order Delivered!';
              message = 'Your order has been delivered successfully';
              // Create payment record using secure RPC
              try {
                await supabase.rpc('create_rider_payment', {
                  _order_id: requestId,
                  _rider_request_id: null,
                });
              } catch (paymentError) {
                console.log('Payment creation:', paymentError);
              }
              break;
            case 'cancelled':
              title = '❌ Order Cancelled';
              message = 'Your order has been cancelled';
              break;
          }
          
          if (title) {
            await createNotification(
              customerId,
              title,
              message,
              'order',
              requestId,
              undefined
            );
          }
        }

        return data;
      } else {
        // Update rider request (existing logic)
        const { data: request } = await supabase
          .from('rider_requests')
          .select('customer_id')
          .eq('id', requestId)
          .single();

        customerId = request?.customer_id || null;

        const { data, error } = await supabase
          .from('rider_requests')
          .update({ status })
          .eq('id', requestId)
          .eq('rider_id', riderProfile.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating delivery status:', error);
          throw error;
        }

        // Create notification for customer
        if (customerId) {
          let title = '';
          let message = '';
          
          switch (status) {
            case 'on_way':
              title = '🚀 Rider On The Way!';
              message = 'Your rider is on the way to deliver your package';
              break;
            case 'delivered':
              title = '✅ Delivery Completed!';
              message = 'Your package has been delivered successfully';
              // Create payment record using secure RPC
              try {
                await supabase.rpc('create_rider_payment', {
                  _order_id: null,
                  _rider_request_id: requestId,
                });
              } catch (paymentError) {
                console.log('Payment creation:', paymentError);
              }
              break;
            case 'cancelled':
              title = '❌ Delivery Cancelled';
              message = 'Your delivery has been cancelled';
              break;
          }
          
          if (title) {
            await createNotification(
              customerId,
              title,
              message,
              'order',
              undefined,
              requestId
            );
          }
        }

        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-active-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['my-completed-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['business-orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['rider-payments'] });
      queryClient.invalidateQueries({ queryKey: ['rider-earnings-summary'] });
      queryClient.invalidateQueries({ queryKey: ['all-rider-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
};

export const useToggleOnlineStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (isOnline: boolean) => {
      if (!user) throw new Error('User not authenticated');

      console.log('[useToggleOnlineStatus] Setting rider online status:', isOnline);

      const { data, error } = await supabase
        .from('riders')
        .update({ 
          is_online: isOnline,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[useToggleOnlineStatus] Error toggling online status:', error);
        throw error;
      }

      console.log('[useToggleOnlineStatus] Rider online status updated:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider-profile'] });
      queryClient.invalidateQueries({ queryKey: ['online-riders'] });
    },
  });
};

// Hook to auto-set rider online when dashboard mounts
export const useAutoSetRiderOnline = (riderId: string | undefined, currentOnlineStatus: boolean | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    // Only auto-set online if rider exists and is currently offline
    if (!user || !riderId || currentOnlineStatus === true) return;

    const setOnline = async () => {
      console.log('[useAutoSetRiderOnline] Auto-setting rider online on dashboard mount');
      
      const { error } = await supabase
        .from('riders')
        .update({ 
          is_online: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('[useAutoSetRiderOnline] Error setting online:', error);
      } else {
        console.log('[useAutoSetRiderOnline] Rider set to online');
        queryClient.invalidateQueries({ queryKey: ['rider-profile'] });
        queryClient.invalidateQueries({ queryKey: ['online-riders'] });
      }
    };

    setOnline();
  }, [user, riderId, currentOnlineStatus, queryClient]);

  // Set offline when component unmounts or tab closes
  useEffect(() => {
    if (!user || !riderId) return;

    const handleBeforeUnload = async () => {
      console.log('[useAutoSetRiderOnline] Tab closing, setting rider offline');
      // Use sendBeacon for reliable offline setting on tab close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/riders?user_id=eq.${user.id}`;
      const body = JSON.stringify({ is_online: false, updated_at: new Date().toISOString() });
      
      navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // Don't set offline immediately on visibility change, just log
        console.log('[useAutoSetRiderOnline] Tab hidden');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, riderId]);
};

export const useRegisterAsRider = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (riderData: { name: string; phone: string; vehicle_type: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('riders')
        .insert({
          user_id: user.id,
          name: riderData.name,
          phone: riderData.phone,
          vehicle_type: riderData.vehicle_type,
          is_active: true,
          is_online: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error registering as rider:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider-profile'] });
    },
  });
};

// Hook to update rider profile (including image)
export const useUpdateRiderProfile = () => {
  const queryClient = useQueryClient();
  const { data: riderProfile } = useRiderProfile();

  return useMutation({
    mutationFn: async (updates: { 
      name?: string; 
      phone?: string; 
      vehicle_type?: string;
      image?: string | null;
    }) => {
      if (!riderProfile) throw new Error('Rider profile not found');

      const { data, error } = await supabase
        .from('riders')
        .update(updates)
        .eq('id', riderProfile.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating rider profile:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider-profile'] });
    },
  });
};
