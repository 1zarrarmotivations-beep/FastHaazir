import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { createNotification } from "./useNotifications";
import { toast } from "sonner";
export type OrderStatus = 'placed' | 'preparing' | 'on_way' | 'delivered' | 'cancelled';

export interface RiderRequest {
  id: string;
  type?: 'rider_request' | 'order' | 'grocery';
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
  rider_earning?: number;
  commission?: number;
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
  cnic_front: string | null;
  cnic_back: string | null;
  license_image: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
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

      return data as any as RiderProfile | null;
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
        .select('*, businesses(name), customer_profiles!inner(phone)')
        .in('status', ['placed', 'preparing'])
        .is('rider_id', null)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching business orders:', ordersError);
      }

      // Transform rider requests
      const formattedRiderRequests: RiderRequest[] = (riderRequests || []).map((req: any) => ({
        ...req,
        type: 'rider_request' as const,
        rider_earning: req.rider_earning,
        commission: req.commission,
      }));

      // Transform business orders to match RiderRequest interface
      const formattedBusinessOrders: RiderRequest[] = (businessOrders || []).map((order: any) => ({
        id: order.id,
        type: 'order' as const,
        customer_id: order.customer_id,
        customer_phone: order.customer_profiles?.phone || null,
        rider_id: order.rider_id,
        status: order.status as OrderStatus,
        pickup_address: order.businesses?.name || order.pickup_address || 'Business',
        dropoff_address: order.delivery_address || 'Customer Location',
        pickup_lat: order.pickup_lat,
        pickup_lng: order.pickup_lng,
        dropoff_lat: order.delivery_lat,
        dropoff_lng: order.delivery_lng,
        item_description: Array.isArray(order.items) ? `${order.items.length} item(s) from ${order.businesses?.name || 'Business'}` : 'Food Order',
        item_image: null,
        total: Number((order.total_amount ?? order.total) || 0),
        created_at: order.created_at,
        updated_at: order.updated_at,
        business_name: order.businesses?.name,
        items: Array.isArray(order.items) ? order.items : [],
        rider_earning: order.rider_earning,
        commission: order.commission,
      }));

      // Fetch grocery orders
      const { data: groceryOrders, error: groceryError } = await supabase
        .from('grocery_orders')
        .select('*, profiles!inner(phone)')
        .is('rider_id', null)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (groceryError) {
        console.error('Error fetching grocery orders:', groceryError);
      }

      const formattedGroceryOrders: RiderRequest[] = (groceryOrders || []).map((order: any) => ({
        id: order.id,
        type: 'grocery',
        customer_id: order.customer_id,
        customer_phone: order.profiles?.phone || null,
        rider_id: order.rider_id,
        status: order.status as OrderStatus,
        pickup_address: 'Fast Haazir Grocery Store',
        dropoff_address: order.delivery_address || 'Customer Location',
        pickup_lat: null, // Grocery store location could be added to settings
        pickup_lng: null,
        dropoff_lat: null,
        dropoff_lng: null,
        item_description: 'Grocery Delivery',
        item_image: null,
        total: Number(order.total_amount || 0),
        created_at: order.created_at,
        updated_at: order.updated_at,
        business_name: 'Grocery Store',
        items: [],
        rider_earning: 100, // Static for now
        commission: 0,
      }));

      // Combine and sort by created_at
      const allRequests = [...formattedRiderRequests, ...formattedBusinessOrders, ...formattedGroceryOrders].sort(
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
        .select('*, businesses(name), customer_profiles!inner(phone)')
        .eq('rider_id', riderProfile.id)
        .in('status', ['placed', 'preparing', 'on_way'])
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching active business orders:', ordersError);
      }

      // Transform rider requests
      const formattedRiderRequests: RiderRequest[] = (riderRequests as any[] || []).map(req => ({
        ...req,
        type: 'rider_request' as const,
        status: req.status as OrderStatus,
        pickup_address: req.pickup_address || '',
        dropoff_address: req.dropoff_address || '',
        total: Number(req.total || 0),
        created_at: req.created_at || new Date().toISOString(),
        updated_at: req.updated_at || new Date().toISOString(),
        rider_earning: Number(req.rider_earning || 0),
        commission: Number(req.commission || 0),
      }));


      // Transform business orders
      const formattedBusinessOrders: RiderRequest[] = (businessOrders || []).map((order: any) => ({
        id: order.id,
        type: 'order' as const,
        customer_id: order.customer_id,
        customer_phone: order.customer_profiles?.phone || null,
        rider_id: order.rider_id,
        status: order.status as OrderStatus,
        pickup_address: order.businesses?.name || order.pickup_address || 'Business',
        dropoff_address: order.delivery_address || 'Customer Location',
        pickup_lat: order.pickup_lat,
        pickup_lng: order.pickup_lng,
        dropoff_lat: order.delivery_lat,
        dropoff_lng: order.delivery_lng,
        item_description: Array.isArray(order.items) ? `${order.items.length} item(s) from ${order.businesses?.name || 'Business'}` : 'Food Order',
        item_image: null,
        total: Number((order.total_amount ?? order.total) || 0),
        created_at: order.created_at,
        updated_at: order.updated_at,
        business_name: order.businesses?.name,
        items: Array.isArray(order.items) ? order.items : [],
        rider_earning: Number(order.rider_earning || 0),
        commission: Number(order.commission || 0),
      }));

      // Fetch active grocery orders
      const { data: groceryOrders, error: groceryError } = await supabase
        .from('grocery_orders')
        .select('*, profiles!inner(phone)')
        .eq('rider_id', riderProfile.id)
        .in('status', ['pending', 'preparing', 'on_way'])
        .order('created_at', { ascending: false });

      const formattedGroceryOrders: RiderRequest[] = (groceryOrders || []).map((order: any) => ({
        id: order.id,
        type: 'grocery',
        customer_id: order.customer_id,
        customer_phone: order.profiles?.phone || null,
        rider_id: order.rider_id,
        status: order.status as OrderStatus,
        pickup_address: 'Fast Haazir Grocery Store',
        dropoff_address: order.delivery_address || 'Customer Location',
        total: Number(order.total_amount || 0),
        created_at: order.created_at,
        updated_at: order.updated_at,
        business_name: 'Grocery Store',
        items: [],
        rider_earning: 100,
      }));

      // Combine and sort
      const allDeliveries = [...formattedRiderRequests, ...formattedBusinessOrders, ...formattedGroceryOrders].sort(
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
        .select('*, businesses(name), customer_profiles!inner(phone)')
        .eq('rider_id', riderProfile.id)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false })
        .limit(20);

      if (ordersError) {
        console.error('Error fetching completed business orders:', ordersError);
      }

      // Transform rider requests
      const formattedRiderRequests: RiderRequest[] = (riderRequests as any[] || []).map(req => ({
        ...req,
        type: 'rider_request' as const,
        status: req.status as OrderStatus,
        pickup_address: req.pickup_address || '',
        dropoff_address: (req as any).dropoff_address || '',
        total: Number(req.total || 0),
        created_at: req.created_at || new Date().toISOString(),
        updated_at: req.updated_at || new Date().toISOString(),
      }));


      // Transform business orders
      const formattedBusinessOrders: RiderRequest[] = (businessOrders || []).map((order: any) => ({
        id: order.id,
        type: 'order' as const,
        customer_id: order.customer_id,
        customer_phone: order.customer_profiles?.phone || null,
        rider_id: order.rider_id,
        status: order.status as OrderStatus,
        pickup_address: order.pickup_address || order.businesses?.name || 'Business',
        dropoff_address: order.delivery_address || 'Customer Location',
        pickup_lat: order.pickup_lat,
        pickup_lng: order.pickup_lng,
        dropoff_lat: order.delivery_lat,
        dropoff_lng: order.delivery_lng,
        item_description: Array.isArray(order.items) ? `${order.items.length} item(s) from ${order.businesses?.name || 'Business'}` : 'Food Order',
        item_image: null,
        total: Number((order.total_amount ?? order.total) || 0),
        created_at: order.created_at,
        updated_at: order.updated_at,
        business_name: order.businesses?.name,
        items: Array.isArray(order.items) ? order.items : [],
      }));

      // Fetch completed grocery orders
      const { data: groceryOrders } = await supabase
        .from('grocery_orders')
        .select('*')
        .eq('rider_id', riderProfile.id)
        .eq('status', 'delivered')
        .limit(20);

      const formattedGroceryOrders: RiderRequest[] = (groceryOrders || []).map((order: any) => ({
        id: order.id,
        type: 'grocery',
        customer_id: order.customer_id,
        status: order.status as OrderStatus,
        pickup_address: 'Grocery Store',
        dropoff_address: order.delivery_address || '',
        total: Number(order.total_amount || 0),
        created_at: order.created_at,
        updated_at: order.updated_at,
      }));

      // Combine and sort
      const allDeliveries = [...formattedRiderRequests, ...formattedBusinessOrders, ...formattedGroceryOrders].sort(
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
    mutationFn: async ({ requestId, requestType }: { requestId: string; requestType: 'rider_request' | 'order' | 'grocery' }) => {

      if (!riderProfile) throw new Error('Rider profile not found');

      let customerId: string | null = null;

      if (requestType === ('grocery' as any)) {
        const { error } = await supabase
          .from('grocery_orders')
          .update({
            rider_id: riderProfile.id,
            status: 'preparing'
          })
          .eq('id', requestId)
          .is('rider_id', null);

        if (error) throw error;
        return { success: true };
      }

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
        const { data, error } = await (supabase
          .from('orders')
          .update({
            rider_id: riderProfile.id,
            status: 'preparing'
          } as any)
          .eq('id', requestId)
          .is('rider_id', null)
          .select()
          .single() as any);


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
        const { data, error } = await (supabase
          .from('rider_requests')
          .update({
            rider_id: riderProfile.id,
            status: 'preparing'
          } as any)
          .eq('id', requestId)
          .eq('status', 'placed')
          .is('rider_id', null)
          .select()
          .single() as any);


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
    mutationFn: async ({ requestId, status, requestType }: { requestId: string; status: OrderStatus; requestType?: 'rider_request' | 'order' | 'grocery' }) => {
      if (!riderProfile) throw new Error('Rider profile not found');

      let customerId: string | null = null;
      const type = requestType || 'rider_request';

      if (type === 'grocery') {
        const { error } = await supabase
          .from('grocery_orders')
          .update({ status })
          .eq('id', requestId);

        if (error) throw error;

        // Trigger payment for grocery
        if (status === 'delivered') {
          await supabase.rpc('create_rider_payment_grocery', { _order_id: requestId });
        }

        return { success: true };
      }

      // Use Secure RPC for status updates (Task 5)
      const { data: rpcData, error: rpcError } = await supabase.rpc('secure_update_order_status' as any, {
        p_id: requestId,
        p_new_status: status,
        p_rider_id: riderProfile.id,
        p_type: type
      });

      if (rpcError) {
        console.error('Error updating delivery status via RPC:', rpcError);
        throw new Error(rpcError.message || 'Failed to update delivery status');
      }

      const result = rpcData as unknown as { success: boolean, error?: string, status?: string };

      if (!result.success) {
        console.error('Secure update rejected:', result.error);
        throw new Error(result.error || 'Permission denied or distance too far');
      }

      // Handle post-update success (Notifications & Payments)
      if (type === 'order') {
        const { data: order } = await supabase
          .from('orders')
          .select('customer_id')
          .eq('id', requestId)
          .single();
        customerId = order?.customer_id || null;
      } else {
        const { data: request } = await supabase
          .from('rider_requests')
          .select('customer_id')
          .eq('id', requestId)
          .single();
        customerId = request?.customer_id || null;
      }

      if (customerId) {
        let title = '';
        let message = '';

        if (status === 'on_way') {
          title = type === 'order' ? '🚀 Your Order is On The Way!' : '🚀 Rider On The Way!';
          message = type === 'order' ? 'Your rider is delivering your order' : 'Your rider is on the way to deliver your package';
        } else if (status === 'delivered') {
          title = type === 'order' ? '✅ Order Delivered!' : '✅ Delivery Completed!';
          message = type === 'order' ? 'Your order has been delivered successfully' : 'Your package has been delivered successfully';

          // Legacy payment trigger (keep for compatibility if create_rider_payment isn't in RPC yet)
          try {
            await supabase.rpc('create_rider_payment', {
              _order_id: type === 'order' ? requestId : null,
              _rider_request_id: type === 'rider_request' ? requestId : null,
            });
          } catch (e) {
            console.log('Payment RPC check (likely already handled by trigger or status change):', e);
          }
        } else if (status === 'cancelled') {
          title = type === 'order' ? '❌ Order Cancelled' : '❌ Delivery Cancelled';
          message = type === 'order' ? 'Your order has been cancelled' : 'Your delivery has been cancelled';
        }

        if (title) {
          await createNotification(
            customerId,
            title,
            message,
            'order',
            type === 'order' ? requestId : undefined,
            type === 'rider_request' ? requestId : undefined
          );
        }
      }

      return result;
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

      const { data, error } = await (supabase
        .from('riders')
        .update({
          is_online: isOnline,
          last_online_at: new Date().toISOString()
        } as any)
        .eq('user_id', user.id)
        .select()
        .single() as any);


      if (error) {
        console.error('[useToggleOnlineStatus] Error toggling online status:', error);
        throw error;
      }

      console.log('[useToggleOnlineStatus] Rider online status updated:', data);
      return data;
    },
    onSuccess: (data, isOnline) => {
      queryClient.invalidateQueries({ queryKey: ['rider-profile'] });
      queryClient.invalidateQueries({ queryKey: ['online-riders'] });
      toast.success(isOnline ? "You are now ONLINE" : "You are now OFFLINE");
    },
    onError: (error: any) => {
      console.error('[useToggleOnlineStatus] Failed:', error);
      toast.error(error.message || "Failed to update status");
    }
  });
};

// Hook to auto-set rider offline on unmount (session hygiene)
export const useAutoSetRiderOnline = (riderId: string | undefined, currentOnlineStatus: boolean | null) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // HEALERS NOTE: Auto-online on mount is REMOVED to give riders manual control.
  // Manual online/offline toggle is more battery efficient and preferred by riders.

  // Set offline when component unmounts or tab closes
  useEffect(() => {
    if (!user || !riderId) return;

    const handleBeforeUnload = async () => {
      console.log('[useAutoSetRiderOnline] Tab closing, setting rider offline');
      // Use sendBeacon for reliable offline setting on tab close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/riders?user_id=eq.${user.id}`;
      const body = JSON.stringify({ is_online: false, updated_at: new Date().toISOString() });
      const headers = {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      };

      // Note: sendBeacon doesn't support custom headers easily, 
      // but Supabase Anon Key can be in URL for some setups. 
      // We'll stick to a best-effort fetch with keepalive.
      fetch(url, {
        method: 'PATCH',
        body,
        headers,
        keepalive: true
      });
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

// Hook to get rider application status
export const useRiderApplication = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['rider-application', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('rider_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching rider application:', error);
        return null;
      }

      return data;
    },
    enabled: !!user,
  });
};

export const useRegisterAsRider = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (riderData: {
      name: string;
      phone: string;
      vehicle_type: string;
      cnic?: string;
      cnic_front?: string;
      cnic_back?: string;
      license_image?: string;
      experience_years?: number;
      license_number?: string;
      notes?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // 1. Insert into rider_applications
      const { data, error } = await supabase
        .from('rider_applications')
        .insert({
          user_id: user.id,
          vehicle_type: riderData.vehicle_type,
          license_number: riderData.license_number || riderData.cnic,
          experience_years: riderData.experience_years || 0,
          notes: JSON.stringify({
            name: riderData.name,
            phone: riderData.phone,
            cnic: riderData.cnic,
            cnic_front: riderData.cnic_front,
            cnic_back: riderData.cnic_back,
            license_image: riderData.license_image
          }),
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting rider application:', error);
        throw error;
      }

      // 2. Insert into riders with pending status (to allow unified RPC to see it)
      const { error: riderError } = await supabase
        .from('riders')
        .upsert({
          user_id: user.id,
          name: riderData.name,
          phone: riderData.phone,
          vehicle_type: riderData.vehicle_type,
          cnic: riderData.cnic,
          cnic_front: riderData.cnic_front,
          cnic_back: riderData.cnic_back,
          license_image: riderData.license_image,
          verification_status: 'pending',
          is_active: true, // Must be true to avoid 'blocked' status in RPC
          rating: 0,
          total_trips: 0
        }, { onConflict: 'user_id' }); // If exists, update

      if (riderError) {
        console.error('Error creating pending rider profile:', riderError);
        // Continue anyway, application is submitted
      }

      // 3. Update Profile Role to Rider (so RPC routes correctly to 'pending' screen)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'rider' })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error updating profile role:', profileError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider-profile'] });
      queryClient.invalidateQueries({ queryKey: ['rider-application'] });
      // Invalidate role query to trigger immediate re-routing
      queryClient.invalidateQueries({ queryKey: ['user-role'] });
      toast.success("Application submitted successfully!");
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

      const { data, error } = await (supabase
        .from('riders')
        .update(updates as any)
        .eq('id', riderProfile.id)
        .select()
        .single() as any);


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
