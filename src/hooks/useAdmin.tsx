import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { normalizePhoneDigits } from "@/lib/phoneUtils";
import { useEffect } from "react";

// Check if user is admin
export const useIsAdmin = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log("[useIsAdmin] No user id, returning false");
        return false;
      }
      
      console.log("[useIsAdmin] Checking admin role for user:", user.id);
      
      const { data, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });
      
      if (error) {
        console.error("[useIsAdmin] Error checking admin role:", error);
        return false;
      }
      
      console.log("[useIsAdmin] Admin check result:", data);
      return data;
    },
    enabled: !!user?.id,
  });
};

// Check user role for routing - with caching
export const useUserRole = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log("[useUserRole] No user id, returning null");
        return null;
      }
      
      console.log("[useUserRole] Checking role for user:", user.id);
      
      // Use Promise.all for parallel checks
      const [adminResult, riderResult, businessResult] = await Promise.all([
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
        supabase.from('riders').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('businesses').select('id').eq('owner_user_id', user.id).maybeSingle(),
      ]);
      
      console.log("[useUserRole] Role check results:", {
        admin: adminResult.data,
        rider: !!riderResult.data,
        business: !!businessResult.data,
      });
      
      // Check admin first
      if (adminResult.data) {
        console.log("[useUserRole] User is admin");
        return 'admin';
      }
      
      // Check rider
      if (riderResult.data) {
        console.log("[useUserRole] User is rider");
        return 'rider';
      }
      
      // Check business
      if (businessResult.data) {
        console.log("[useUserRole] User is business");
        return 'business';
      }
      
      console.log("[useUserRole] User is customer (default)");
      return 'customer';
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // Cache role for 1 minute (reduced from 5)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
};

// Admin stats
export const useAdminStats = () => {
  const queryClient = useQueryClient();

  // Set up realtime subscriptions for all stat-related tables
  useEffect(() => {
    console.log('[useAdminStats] Setting up realtime subscriptions');
    
    const ordersChannel = supabase
      .channel('admin-stats-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      })
      .subscribe();

    const ridersChannel = supabase
      .channel('admin-stats-riders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'riders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      })
      .subscribe();

    const businessesChannel = supabase
      .channel('admin-stats-businesses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      })
      .subscribe();

    const requestsChannel = supabase
      .channel('admin-stats-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      })
      .subscribe();

    return () => {
      console.log('[useAdminStats] Cleaning up realtime subscriptions');
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(ridersChannel);
      supabase.removeChannel(businessesChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [ordersRes, ridersRes, businessesRes, requestsRes] = await Promise.all([
        supabase.from("orders").select("id, total, status"),
        supabase.from("riders").select("id, is_active, is_online"),
        supabase.from("businesses").select("id, is_active, type"),
        supabase.from("rider_requests").select("id, total, status"),
      ]);

      const orders = ordersRes.data || [];
      const riders = ridersRes.data || [];
      const businesses = businessesRes.data || [];
      const requests = requestsRes.data || [];

      const totalOrders = orders.length + requests.length;
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0) + 
                          requests.reduce((sum, r) => sum + (r.total || 0), 0);
      const activeRiders = riders.filter(r => r.is_active).length;
      const onlineRiders = riders.filter(r => r.is_online).length;
      const activeBusinesses = businesses.filter(b => b.is_active).length;
      
      // Count by type
      const restaurantCount = businesses.filter(b => b.type === 'restaurant').length;
      const groceryCount = businesses.filter(b => b.type === 'grocery').length;
      const bakeryCount = businesses.filter(b => b.type === 'bakery').length;
      const shopCount = businesses.filter(b => b.type === 'shop').length;

      // Order status counts
      const pendingOrders = orders.filter(o => o.status === 'placed').length + 
                           requests.filter(r => r.status === 'placed').length;
      const preparingOrders = orders.filter(o => o.status === 'preparing').length;
      const onWayOrders = orders.filter(o => o.status === 'on_way').length + 
                          requests.filter(r => r.status === 'on_way').length;
      const deliveredOrders = orders.filter(o => o.status === 'delivered').length + 
                             requests.filter(r => r.status === 'delivered').length;

      return {
        totalOrders,
        totalRevenue,
        activeRiders,
        onlineRiders,
        activeBusinesses,
        totalRiders: riders.length,
        totalBusinesses: businesses.length,
        restaurantCount,
        groceryCount,
        bakeryCount,
        shopCount,
        pendingOrders,
        preparingOrders,
        onWayOrders,
        deliveredOrders,
      };
    },
  });
};

// All riders for admin
export const useAdminRiders = () => {
  const queryClient = useQueryClient();

  // Set up realtime subscription for riders
  useEffect(() => {
    console.log('[useAdminRiders] Setting up realtime subscription');
    
    const channel = supabase
      .channel('admin-riders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'riders',
        },
        (payload) => {
          console.log('[useAdminRiders] Rider changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['admin-riders'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
          queryClient.invalidateQueries({ queryKey: ['online-riders'] });
        }
      )
      .subscribe();

    return () => {
      console.log('[useAdminRiders] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["admin-riders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("riders")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

// All businesses for admin
export const useAdminBusinesses = () => {
  const queryClient = useQueryClient();

  // Set up realtime subscription for businesses
  useEffect(() => {
    console.log('[useAdminBusinesses] Setting up realtime subscription');
    
    const channel = supabase
      .channel('admin-businesses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'businesses',
        },
        (payload) => {
          console.log('[useAdminBusinesses] Business changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
          queryClient.invalidateQueries({ queryKey: ['businesses'] });
        }
      )
      .subscribe();

    return () => {
      console.log('[useAdminBusinesses] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

// Menu items for a business
export const useBusinessMenuItems = (businessId: string | null) => {
  const queryClient = useQueryClient();

  // Set up realtime subscription for menu items
  useEffect(() => {
    if (!businessId) return;
    
    console.log('[useBusinessMenuItems] Setting up realtime subscription for business:', businessId);
    
    const channel = supabase
      .channel(`menu-items-realtime-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          console.log('[useBusinessMenuItems] Menu item changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['business-menu-items', businessId] });
        }
      )
      .subscribe();

    return () => {
      console.log('[useBusinessMenuItems] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient, businessId]);

  return useQuery({
    queryKey: ["business-menu-items", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("business_id", businessId)
        .order("category", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
};

// All orders for admin
export const useAdminOrders = () => {
  const queryClient = useQueryClient();

  // Set up realtime subscription for orders
  useEffect(() => {
    console.log('[useAdminOrders] Setting up realtime subscription');
    
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('[useAdminOrders] Order changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        }
      )
      .subscribe();

    return () => {
      console.log('[useAdminOrders] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, riders(name, phone)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

// All rider requests for admin
export const useAdminRiderRequests = () => {
  const queryClient = useQueryClient();

  // Set up realtime subscription for rider requests
  useEffect(() => {
    console.log('[useAdminRiderRequests] Setting up realtime subscription');
    
    const channel = supabase
      .channel('admin-rider-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rider_requests',
        },
        (payload) => {
          console.log('[useAdminRiderRequests] Rider request changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['admin-rider-requests'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        }
      )
      .subscribe();

    return () => {
      console.log('[useAdminRiderRequests] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["admin-rider-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rider_requests")
        .select("*, riders(name, phone, vehicle_type)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

// Create rider - normalize phone to digits only
export const useCreateRider = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (riderData: {
      name: string;
      phone: string;
      email?: string;
      cnic?: string;
      vehicle_type?: string;
      commission_rate?: number;
    }) => {
      // Normalize phone to digits only format for database
      const normalizedPhone = normalizePhoneDigits(riderData.phone);
      
      console.log("[Admin] Creating rider:", {
        phone: normalizedPhone,
        email: riderData.email || null,
      });
      
      const { data, error } = await supabase
        .from("riders")
        .insert({
          name: riderData.name,
          phone: normalizedPhone,
          email: riderData.email?.trim() || null,
          cnic: riderData.cnic || null,
          vehicle_type: riderData.vehicle_type || 'Bike',
          commission_rate: riderData.commission_rate || 10,
          is_active: true,
          is_online: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Rider created successfully! They can login with Phone OTP or Email/Google.");
    },
    onError: (error: Error) => {
      toast.error("Failed to create rider: " + error.message);
    },
  });
};

// Delete rider
export const useDeleteRider = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (riderId: string) => {
      const { error } = await supabase
        .from("riders")
        .delete()
        .eq("id", riderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Rider deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete rider: " + error.message);
    },
  });
};

// Toggle rider status
export const useToggleRiderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ riderId, isActive }: { riderId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("riders")
        .update({ is_active: isActive })
        .eq("id", riderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Rider status updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update rider: " + error.message);
    },
  });
};

// Create business - normalize phone to digits only, with location
export const useCreateBusiness = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (businessData: {
      name: string;
      type: 'restaurant' | 'grocery' | 'bakery' | 'shop';
      description?: string;
      category?: string;
      image?: string;
      owner_phone?: string;
      owner_email?: string;
      commission_rate?: number;
      location_lat?: number | null;
      location_lng?: number | null;
      location_address?: string;
    }) => {
      // Normalize phone to digits only format for database
      const normalizedPhone = businessData.owner_phone 
        ? normalizePhoneDigits(businessData.owner_phone) 
        : null;
      
      console.log("[Admin] Creating business:", {
        phone: normalizedPhone,
        email: businessData.owner_email || null,
        location: businessData.location_address || 'No location',
      });
      
      const { data, error } = await supabase
        .from("businesses")
        .insert([{
          name: businessData.name,
          type: businessData.type,
          description: businessData.description || null,
          category: businessData.category || null,
          image: businessData.image || null,
          owner_phone: normalizedPhone,
          owner_email: businessData.owner_email?.trim() || null,
          commission_rate: businessData.commission_rate || 15,
          is_active: true,
          featured: false,
          location_lat: businessData.location_lat || null,
          location_lng: businessData.location_lng || null,
          location_address: businessData.location_address || null,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Business created with pickup location!");
    },
    onError: (error: Error) => {
      toast.error("Failed to create business: " + error.message);
    },
  });
};

// Delete business
export const useDeleteBusiness = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (businessId: string) => {
      // First delete menu items
      await supabase
        .from("menu_items")
        .delete()
        .eq("business_id", businessId);
        
      const { error } = await supabase
        .from("businesses")
        .delete()
        .eq("id", businessId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Business deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete business: " + error.message);
    },
  });
};

// Toggle business status
export const useToggleBusinessStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ businessId, isActive }: { businessId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("businesses")
        .update({ is_active: isActive })
        .eq("id", businessId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Business status updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update business: " + error.message);
    },
  });
};

// Toggle business featured
export const useToggleBusinessFeatured = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ businessId, featured }: { businessId: string; featured: boolean }) => {
      const { error } = await supabase
        .from("businesses")
        .update({ featured })
        .eq("id", businessId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success("Business featured status updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update business: " + error.message);
    },
  });
};

// Create menu item
export const useCreateMenuItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemData: {
      business_id: string;
      name: string;
      description?: string;
      price: number;
      category?: string;
      image?: string;
      is_popular?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("menu_items")
        .insert([{
          business_id: itemData.business_id,
          name: itemData.name,
          description: itemData.description || null,
          price: itemData.price,
          category: itemData.category || null,
          image: itemData.image || null,
          is_popular: itemData.is_popular || false,
          is_available: true,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["business-menu-items", variables.business_id] });
      toast.success("Menu item added successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to add menu item: " + error.message);
    },
  });
};

// Delete menu item
export const useDeleteMenuItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, businessId }: { itemId: string; businessId: string }) => {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", itemId);
      
      if (error) throw error;
      return businessId;
    },
    onSuccess: (businessId) => {
      queryClient.invalidateQueries({ queryKey: ["business-menu-items", businessId] });
      toast.success("Menu item deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete menu item: " + error.message);
    },
  });
};

// Toggle menu item availability
export const useToggleMenuItemAvailability = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, businessId, isAvailable }: { 
      itemId: string; 
      businessId: string;
      isAvailable: boolean 
    }) => {
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: isAvailable })
        .eq("id", itemId);
      
      if (error) throw error;
      return businessId;
    },
    onSuccess: (businessId) => {
      queryClient.invalidateQueries({ queryKey: ["business-menu-items", businessId] });
      toast.success("Menu item availability updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update menu item: " + error.message);
    },
  });
};

// Update order status
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, status }: { 
      orderId: string; 
      status: 'placed' | 'preparing' | 'on_way' | 'delivered' | 'cancelled';
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Order status updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update order: " + error.message);
    },
  });
};

// Assign rider to order
export const useAssignRiderToOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, riderId }: { orderId: string; riderId: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ rider_id: riderId, status: 'preparing' })
        .eq("id", orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Rider assigned successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to assign rider: " + error.message);
    },
  });
};

// Update rider request status
export const useUpdateRiderRequestStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ requestId, status }: { 
      requestId: string; 
      status: 'placed' | 'preparing' | 'on_way' | 'delivered' | 'cancelled';
    }) => {
      const { error } = await supabase
        .from("rider_requests")
        .update({ status })
        .eq("id", requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rider-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Request status updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update request: " + error.message);
    },
  });
};

// Assign rider to request
export const useAssignRiderToRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ requestId, riderId }: { requestId: string; riderId: string }) => {
      const { error } = await supabase
        .from("rider_requests")
        .update({ rider_id: riderId, status: 'preparing' })
        .eq("id", requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rider-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Rider assigned successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to assign rider: " + error.message);
    },
  });
};

// Update business details
export const useUpdateBusiness = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      businessId, 
      updates 
    }: { 
      businessId: string; 
      updates: {
        name?: string;
        description?: string;
        category?: string;
        image?: string;
        owner_phone?: string;
        commission_rate?: number;
        is_active?: boolean;
        featured?: boolean;
        is_blocked?: boolean;
      }
    }) => {
      // Normalize phone if provided
      const normalizedUpdates = {
        ...updates,
        owner_phone: updates.owner_phone 
          ? normalizePhoneDigits(updates.owner_phone)
          : updates.owner_phone,
      };
      
      const { error } = await supabase
        .from("businesses")
        .update(normalizedUpdates)
        .eq("id", businessId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success("Business updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update business: " + error.message);
    },
  });
};

// Update rider details
export const useUpdateRider = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      riderId, 
      updates 
    }: { 
      riderId: string; 
      updates: {
        name?: string;
        phone?: string;
        cnic?: string;
        vehicle_type?: string;
        commission_rate?: number;
        is_active?: boolean;
        is_blocked?: boolean;
      }
    }) => {
      // Normalize phone if provided
      const normalizedUpdates = {
        ...updates,
        phone: updates.phone 
          ? normalizePhoneDigits(updates.phone)
          : updates.phone,
      };
      
      const { error } = await supabase
        .from("riders")
        .update(normalizedUpdates)
        .eq("id", riderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      toast.success("Rider updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update rider: " + error.message);
    },
  });
};

// Fetch online riders for live map
export const useOnlineRiders = () => {
  return useQuery({
    queryKey: ["online-riders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("riders")
        .select("id, name, phone, current_location_lat, current_location_lng, vehicle_type, is_online")
        .eq("is_online", true)
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });
};

// Admin customers list
export const useAdminCustomers = () => {
  return useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

// Send system notification
export const useSendSystemNotification = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ title, message, userIds }: { 
      title: string; 
      message: string;
      userIds?: string[];
    }) => {
      const { error } = await supabase.rpc("send_system_notification", {
        _title: title,
        _message: message,
        _user_ids: userIds || null,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification sent successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to send notification: " + error.message);
    },
  });
};
