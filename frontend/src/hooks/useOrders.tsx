import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Json } from "@/integrations/supabase/types";
import { createNotification } from "./useNotifications";
import { notifyAllOnlineRiders } from "./useRiderNotifications";
import { useEffect } from "react";
export type OrderStatus = 'placed' | 'preparing' | 'on_way' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Order {
  id: string;
  customer_id: string | null;
  business_id: string | null;
  rider_id: string | null;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  eta: string | null;
  created_at: string;
  businesses?: {
    name: string;
    image: string | null;
  } | null;
  riders?: {
    name: string;
    image?: string | null;
    rating?: number | null;
    vehicle_type?: string | null;
    total_trips?: number | null;
  } | null;
  // For rider requests
  type?: 'order' | 'rider_request';
  dropoff_address?: string;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  item_description?: string;
}

const parseOrderItems = (items: Json): OrderItem[] => {
  if (Array.isArray(items)) {
    return items as unknown as OrderItem[];
  }
  return [];
};

export const useOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up realtime subscription for user's orders
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('[useOrders] Setting up realtime subscription for user:', user.id);
    
    const channel = supabase
      .channel(`orders-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[useOrders] Order changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
          queryClient.invalidateQueries({ queryKey: ['active-orders', user.id] });
        }
      )
      .subscribe();

    return () => {
      console.log('[useOrders] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  return useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          businesses(name, image, owner_phone),
          riders(name, phone, image, rating, vehicle_type, total_trips)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      return (data || []).map(order => ({
        ...order,
        items: parseOrderItems(order.items),
        status: order.status as OrderStatus,
      })) as Order[];
    },
    enabled: !!user,
  });
};

export const useActiveOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up realtime subscriptions for active orders and rider requests
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('[useActiveOrders] Setting up realtime subscriptions for user:', user.id);
    
    const ordersChannel = supabase
      .channel(`active-orders-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[useActiveOrders] Order changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['active-orders', user.id] });
        }
      )
      .subscribe();

    const requestsChannel = supabase
      .channel(`active-rider-requests-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rider_requests',
          filter: `customer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[useActiveOrders] Rider request changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['active-orders', user.id] });
        }
      )
      .subscribe();

    return () => {
      console.log('[useActiveOrders] Cleaning up realtime subscriptions');
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, [queryClient, user?.id]);

  return useQuery({
    queryKey: ['active-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch regular orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          businesses(name, image, owner_phone),
          riders(name, phone, image, rating, vehicle_type, total_trips)
        `)
        .eq('customer_id', user.id)
        .in('status', ['placed', 'preparing', 'on_way'])
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching active orders:', ordersError);
        throw ordersError;
      }

      // Fetch rider requests
      const { data: riderRequests, error: riderRequestsError } = await supabase
        .from('rider_requests')
        .select(`
          *,
          riders(name, phone, image, rating, vehicle_type, total_trips)
        `)
        .eq('customer_id', user.id)
        .in('status', ['placed', 'preparing', 'on_way'])
        .order('created_at', { ascending: false });

      if (riderRequestsError) {
        console.error('Error fetching rider requests:', riderRequestsError);
        throw riderRequestsError;
      }

      // Transform orders
      const transformedOrders = (orders || []).map(order => ({
        ...order,
        items: parseOrderItems(order.items),
        status: order.status as OrderStatus,
        type: 'order' as const,
      }));

      // Transform rider requests to match Order interface
      const transformedRiderRequests = (riderRequests || []).map(request => ({
        id: request.id,
        customer_id: request.customer_id,
        business_id: null,
        rider_id: request.rider_id,
        status: request.status as OrderStatus,
        items: [] as OrderItem[],
        subtotal: request.total,
        delivery_fee: 0,
        total: request.total,
        delivery_address: request.dropoff_address,
        delivery_lat: request.dropoff_lat,
        delivery_lng: request.dropoff_lng,
        pickup_address: request.pickup_address,
        pickup_lat: request.pickup_lat,
        pickup_lng: request.pickup_lng,
        eta: '20-30 min',
        created_at: request.created_at,
        businesses: null,
        riders: request.riders,
        type: 'rider_request' as const,
        dropoff_address: request.dropoff_address,
        dropoff_lat: request.dropoff_lat,
        dropoff_lng: request.dropoff_lng,
        item_description: request.item_description,
      }));

      // Combine and sort by created_at
      const combined = [...transformedOrders, ...transformedRiderRequests];
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return combined as Order[];
    },
    enabled: !!user,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (orderData: {
      business_id: string;
      business_name: string;
      items: OrderItem[];
      subtotal: number;
      delivery_fee: number;
      total: number;
      delivery_address: string;
      delivery_lat?: number;
      delivery_lng?: number;
    }) => {
      // Get current authenticated user from session to ensure we have latest auth state
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id || user?.id;
      
      if (!currentUserId) {
        throw new Error('Please login to place an order');
      }

      const { data, error } = await supabase
        .from('orders')
        .insert({
          customer_id: currentUserId,
          business_id: orderData.business_id,
          items: orderData.items as unknown as Json,
          subtotal: orderData.subtotal,
          delivery_fee: orderData.delivery_fee,
          total: orderData.total,
          delivery_address: orderData.delivery_address,
          delivery_lat: orderData.delivery_lat || null,
          delivery_lng: orderData.delivery_lng || null,
          status: 'placed',
          eta: '25-35 min',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating order:', error);
        throw error;
      }

      // Notify customer about order placed
      await createNotification(
        currentUserId,
        '🛒 Order Placed!',
        `Your order from ${orderData.business_name} has been placed successfully`,
        'order',
        data.id
      );

      // Notify business owner about new order
      const { data: business } = await supabase
        .from('businesses')
        .select('owner_user_id, name')
        .eq('id', orderData.business_id)
        .single();

      if (business?.owner_user_id) {
        await createNotification(
          business.owner_user_id,
          '🍽️ New Order!',
          `You have a new order worth Rs ${orderData.total}`,
          'order',
          data.id
        );
      }

      // Notify all online riders about new order available
      try {
        console.log('[useCreateOrder] Notifying all online riders about new order');
        const notifyResult = await notifyAllOnlineRiders({
          order_id: data.id,
          pickup_address: business?.name || 'Business',
          dropoff_address: orderData.delivery_address,
          order_total: orderData.total,
        });
        console.log('[useCreateOrder] Rider notification results:', notifyResult);
      } catch (notifyError) {
        console.error('[useCreateOrder] Failed to notify riders:', notifyError);
        // Don't throw - order was created successfully
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
    },
  });
};
