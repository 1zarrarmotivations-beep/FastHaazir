import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface BusinessProfile {
  id: string;
  name: string;
  type: 'restaurant' | 'bakery' | 'grocery' | 'shop';
  image: string | null;
  rating: number;
  eta: string;
  distance: string;
  category: string | null;
  description: string | null;
  featured: boolean;
  is_active: boolean;
  owner_phone: string | null;
  owner_user_id: string | null;
  commission_rate: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessMenuItem {
  id: string;
  business_id: string;
  name: string;
  price: number;
  image: string | null;
  category: string | null;
  description: string | null;
  is_popular: boolean;
  is_available: boolean;
}

export interface BusinessOrder {
  id: string;
  business_id: string;
  customer_id: string | null;
  rider_id: string | null;
  status: 'placed' | 'preparing' | 'on_way' | 'delivered' | 'cancelled';
  items: any[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string | null;
  customer_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessStats {
  todayOrders: number;
  todayEarnings: number;
  pendingOrders: number;
  averageRating: number;
  menuItemsCount: number;
  totalOrders: number;
  completedOrders: number;
}

// Get current user's business
export const useMyBusiness = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching business:', error);
        throw error;
      }

      return data as BusinessProfile | null;
    },
    enabled: !!user?.id,
  });
};

// Get business stats
export const useBusinessStats = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ['business-stats', businessId],
    queryFn: async () => {
      if (!businessId) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all orders for this business
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId);

      if (ordersError) throw ordersError;

      // Get menu items count
      const { count: menuCount, error: menuError } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId);

      if (menuError) throw menuError;

      // Get business rating
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('rating')
        .eq('id', businessId)
        .single();

      if (bizError) throw bizError;

      const todayOrders = orders?.filter(o => new Date(o.created_at) >= today) || [];
      const pendingOrders = orders?.filter(o => ['placed', 'confirmed', 'preparing', 'ready'].includes(o.status)) || [];
      const completedOrders = orders?.filter(o => o.status === 'delivered') || [];

      // Calculate earnings (after commission - typically 15%)
      const commissionRate = 0.15;
      const todayEarnings = todayOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.subtotal * (1 - commissionRate)), 0);

      return {
        todayOrders: todayOrders.length,
        todayEarnings,
        pendingOrders: pendingOrders.length,
        averageRating: business?.rating || 0,
        menuItemsCount: menuCount || 0,
        totalOrders: orders?.length || 0,
        completedOrders: completedOrders.length,
      } as BusinessStats;
    },
    enabled: !!businessId,
  });
};

// Get business menu items
export const useBusinessMenuItems = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ['business-menu', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('business_id', businessId)
        .order('category')
        .order('is_popular', { ascending: false });

      if (error) {
        console.error('Error fetching menu items:', error);
        throw error;
      }

      return data as BusinessMenuItem[];
    },
    enabled: !!businessId,
  });
};

// Get business orders
export const useBusinessOrders = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ['business-orders', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      return data as BusinessOrder[];
    },
    enabled: !!businessId,
  });
};

// Toggle business online status
export const useToggleBusinessOnline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ businessId, isActive }: { businessId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('businesses')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', businessId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all business-related queries for live updates
      queryClient.invalidateQueries({ queryKey: ['my-business'] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['business'] });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success('Business status updated');
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    },
  });
};

// Update business profile
export const useUpdateBusinessProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ businessId, updates }: { businessId: string; updates: Partial<BusinessProfile> }) => {
      const { error } = await supabase
        .from('businesses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', businessId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all business-related queries for live updates
      queryClient.invalidateQueries({ queryKey: ['my-business'] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['business'] });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    },
  });
};

// Create menu item
export const useCreateMenuItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<BusinessMenuItem, 'id'>) => {
      const { data, error } = await supabase
        .from('menu_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate all menu-related queries to ensure live updates
      queryClient.invalidateQueries({ queryKey: ['business-menu', variables.business_id] });
      queryClient.invalidateQueries({ queryKey: ['menu-items', variables.business_id] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['business-stats'] });
      toast.success('Menu item added');
    },
    onError: (error) => {
      console.error('Error creating item:', error);
      toast.error('Failed to add item');
    },
  });
};

// Update menu item
export const useUpdateMenuItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, updates, businessId }: { itemId: string; updates: Partial<BusinessMenuItem>; businessId: string }) => {
      const { error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;
      return businessId;
    },
    onSuccess: (businessId) => {
      // Invalidate all menu-related queries to ensure live updates
      queryClient.invalidateQueries({ queryKey: ['business-menu', businessId] });
      queryClient.invalidateQueries({ queryKey: ['menu-items', businessId] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('Item updated');
    },
    onError: (error) => {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    },
  });
};

// Delete menu item
export const useDeleteMenuItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, businessId }: { itemId: string; businessId: string }) => {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return businessId;
    },
    onSuccess: (businessId) => {
      // Invalidate all menu-related queries to ensure live updates
      queryClient.invalidateQueries({ queryKey: ['business-menu', businessId] });
      queryClient.invalidateQueries({ queryKey: ['menu-items', businessId] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['business-stats'] });
      toast.success('Item deleted');
    },
    onError: (error) => {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    },
  });
};

// Update order status
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status, businessId }: { orderId: string; status: BusinessOrder['status']; businessId: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      return businessId;
    },
    onSuccess: (businessId) => {
      queryClient.invalidateQueries({ queryKey: ['business-orders', businessId] });
      queryClient.invalidateQueries({ queryKey: ['business-stats'] });
      toast.success('Order status updated');
    },
    onError: (error) => {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    },
  });
};
