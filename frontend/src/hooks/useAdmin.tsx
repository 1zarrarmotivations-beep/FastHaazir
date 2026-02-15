import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { normalizePhoneDigits } from "@/lib/phoneUtils";
import { useEffect } from "react";
import { roleResolver, type RoleResolution } from "@/lib/roleResolver";

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

  return useQuery<RoleResolution | null>({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log("[useUserRole] No user id, returning null");
        return null;
      }

      console.log("[useUserRole] Fetching full role resolution for:", user.id);
      return roleResolver(user.id, user.email || user.phone);
    },
    enabled: !!user?.id,
    staleTime: 5000,
    gcTime: 5 * 60 * 1000,
  });
};

// Admin stats with live counters
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

    const withdrawalsChannel = supabase
      .channel('admin-stats-withdrawals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      })
      .subscribe();

    const adjustmentsChannel = supabase
      .channel('admin-stats-adjustments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_wallet_adjustments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      })
      .subscribe();

    const paymentsChannel = supabase
      .channel('admin-stats-payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_payments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      })
      .subscribe();

    return () => {
      console.log('[useAdminStats] Cleaning up realtime subscriptions');
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(ridersChannel);
      supabase.removeChannel(businessesChannel);
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(withdrawalsChannel);
      supabase.removeChannel(adjustmentsChannel);
      supabase.removeChannel(paymentsChannel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [ordersRes, ridersRes, businessesRes, requestsRes, withdrawalsRes, adjustmentsRes, paymentsRes] = await Promise.all([
        supabase.from("orders").select("id, total, status"),
        supabase.from("riders").select("id, is_active, is_online"),
        (supabase.from("businesses" as any).select("id, is_active, type, is_busy") as any),
        supabase.from("rider_requests").select("id, total, status"),
        (supabase.from("withdrawal_requests" as any).select("amount, status") as any),
        (supabase.from("rider_wallet_adjustments" as any).select("amount, status, adjustment_type") as any),
        (supabase.from("rider_payments" as any).select("final_amount, status") as any)
      ]);

      const orders = ordersRes.data || [];
      const riders = ridersRes.data || [];
      const businesses = (businessesRes as any).data || [];
      const requests = requestsRes.data || [];
      const withdrawals = (withdrawalsRes as any).data || [];
      const adjustments = (adjustmentsRes as any).data || [];
      const riderPayments = (paymentsRes as any).data || [];

      const totalOrders = orders.length + requests.length;
      const activeRiders = riders.filter(r => r.is_active).length;
      const onlineRiders = riders.filter(r => r.is_online).length;
      const activeBusinesses = businesses.filter((b: any) => b.is_active).length;
      const busyBusinesses = businesses.filter((b: any) => b.is_busy).length;

      // Count by type
      const restaurantCount = businesses.filter((b: any) => b.type === 'restaurant').length;
      const groceryCount = businesses.filter((b: any) => b.type === 'grocery').length;
      const bakeryCount = businesses.filter((b: any) => b.type === 'bakery').length;
      const shopCount = businesses.filter((b: any) => b.type === 'shop').length;
      const pharmacyCount = businesses.filter((b: any) => b.type === 'pharmacy').length;

      // Order status counts
      const pendingOrdersCount = orders.filter(o => o.status === 'placed').length +
        requests.filter(r => r.status === 'placed').length;
      const preparingOrdersCount = orders.filter(o => o.status === 'preparing').length;
      const onWayOrdersCount = orders.filter(o => o.status === 'on_way').length +
        requests.filter(r => r.status === 'on_way').length;
      const deliveredOrdersCount = orders.filter(o => o.status === 'delivered').length +
        requests.filter(r => r.status === 'delivered').length;
      const cancelledOrdersCount = orders.filter(o => o.status === 'cancelled').length +
        requests.filter(r => r.status === 'cancelled').length;

      // Finance calculations
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0) +
        requests.reduce((sum, r) => sum + (r.total || 0), 0);

      const totalRiderEarnings = riderPayments.reduce((sum: number, p: any) => sum + (p.final_amount || 0), 0);
      const pendingWithdrawals = withdrawals.filter((w: any) => w.status === 'pending').reduce((sum: number, w: any) => sum + Number(w.amount), 0);
      const paidWithdrawals = withdrawals.filter((w: any) => w.status === 'paid').reduce((sum: number, w: any) => sum + Number(w.amount), 0);

      const activeAdvances = adjustments.filter((a: any) => a.status === 'active' && a.adjustment_type === 'cash_advance').reduce((sum: number, a: any) => sum + Number(a.amount), 0);

      // Admin profit (Balance)
      const adminBalance = totalRevenue - totalRiderEarnings;

      return {
        totalOrders,
        totalRevenue,
        totalRiderEarnings,
        pendingWithdrawals,
        paidWithdrawals,
        activeAdvances,
        adminBalance,
        activeRiders,
        onlineRiders,
        activeBusinesses,
        busyBusinesses,
        totalRiders: riders.length,
        totalBusinesses: businesses.length,
        restaurantCount,
        groceryCount,
        bakeryCount,
        shopCount,
        pharmacyCount,
        pendingOrders: pendingOrdersCount,
        preparingOrders: preparingOrdersCount,
        onWayOrders: onWayOrdersCount,
        deliveredOrders: deliveredOrdersCount,
        cancelledOrders: cancelledOrdersCount,
        newOrdersCount: pendingOrdersCount
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
        .select("*, riders(name, phone), payments(*)")
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
    mutationFn: async (riderData: any) => {
      let userId = null;
      let createdRider = null;

      // Normalize phone: Ensure it starts with correct format
      let normalizedPhone = (riderData.phone || '').replace(/\D/g, '');
      // If local format (03...), convert to international? Or keep as is.
      // Assuming Admin provides valid phone.

      // 1. If email/password provided, create Auth User via Edge Function
      if (riderData.email && riderData.password) {
        console.log("[Admin] Creating rider with Auth via Edge Function...");
        const { data: authData, error: authError } = await supabase.functions.invoke('create-user', {
          body: {
            email: riderData.email,
            password: riderData.password,
            phone: normalizedPhone,
            role: 'rider',
            userData: {
              name: riderData.name,
              vehicle_type: riderData.vehicle_type,
              phone: normalizedPhone,
              cnic: riderData.cnic,
              commission_rate: Number(riderData.commission_rate),
              is_active: true, // Admin created riders are active by default
              verification_status: 'verified' // Admin created riders are verified
            }
          }
        });

        if (authError) throw authError;
        if (!authData?.success) throw new Error(authData?.error || 'Failed to create user');

        userId = authData.data.user.id;
        console.log("[Admin] Rider Auth & Profile Created:", userId);
        return { id: userId, ...riderData };
      }

      // 2. If NO Auth provided (Manual/Ghost Rider), insert directly
      // WARNING: This branches to a different flow if no email/pass provided.
      console.log("[Admin] Creating manual rider entry (no auth)...");
      const { data, error } = await supabase
        .from("riders")
        .insert({
          user_id: userId, // null
          name: riderData.name,
          phone: normalizedPhone,
          vehicle_type: riderData.vehicle_type,
          cnic: riderData.cnic,
          commission_rate: Number(riderData.commission_rate || 10),
          is_active: true,
          is_online: false,
          verification_status: 'verified'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Rider created successfully! They can login with Phone OTP or Email/Password.");
    },
    onError: (error: Error) => {
      toast.error("Failed to create rider: " + error.message);
    },
  });
};

// Update rider (Admin)
export const useAdminUpdateRider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (riderData: {
      id: string; // Rider ID
      userId?: string | null; // Auth User ID
      name?: string;
      phone?: string;
      email?: string;
      password?: string;
      cnic?: string;
      vehicle_type?: string;
      commission_rate?: number;
    }) => {
      const updates: any = {};
      if (riderData.name) updates.name = riderData.name;
      if (riderData.phone) updates.phone = normalizePhoneDigits(riderData.phone);
      if (riderData.email) updates.email = riderData.email;
      if (riderData.cnic) updates.cnic = riderData.cnic;
      if (riderData.vehicle_type) updates.vehicle_type = riderData.vehicle_type;
      if (riderData.commission_rate) updates.commission_rate = riderData.commission_rate;

      // update riders table
      const { error: dbError } = await supabase
        .from('riders')
        .update(updates)
        .eq('id', riderData.id);

      if (dbError) throw dbError;

      // If password or sensitive auth details changed, call Edge Function
      if (riderData.password || (riderData.email && riderData.userId) || (riderData.phone && riderData.userId)) {
        if (!riderData.userId) {
          if (riderData.password) {
            throw new Error("This rider does not have a linked account yet. Please recreate the rider to set a password.");
          }
          return; // Just updated profile
        }

        const { error: authError } = await supabase.functions.invoke('update-user', {
          body: {
            userId: riderData.userId,
            password: riderData.password,
            email: riderData.email,
            phone: updates.phone
          }
        });

        if (authError) throw new Error("Failed to update auth credentials: " + (authError.message || "Unknown error"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      toast.success("Rider updated successfully");
    },
    onError: (err: Error) => {
      toast.error("Update failed: " + err.message);
    }
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

// Toggle rider status (Block/Unblock)
export const useToggleRiderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ riderId, isActive }: { riderId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("riders")
        .update({
          is_active: isActive,
          // If we unblock, make sure verification status is also verified
          ...(isActive ? { verification_status: 'verified' } : {})
        })
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

// Verify/Reject rider
export const useVerifyRider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ riderId, status }: { riderId: string; status: 'verified' | 'rejected' }) => {
      const { error } = await supabase
        .from("riders")
        .update({
          verification_status: status,
          is_active: status === 'verified' // Auto-activate if verified
        })
        .eq("id", riderId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(variables.status === 'verified' ? "Rider verified and activated!" : "Rider application rejected");
    },
    onError: (error: Error) => {
      toast.error("Failed to complete verification: " + error.message);
    },
  });
};

// Create business - normalize phone to digits only
export const useCreateBusiness = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (businessData: {
      name: string;
      type: 'restaurant' | 'grocery' | 'bakery' | 'shop' | 'pharmacy';
      description?: string;
      category?: string;
      image?: string;
      owner_phone?: string;
      owner_email?: string;
      commission_rate?: number;
      location_lat?: number;
      location_lng?: number;
      location_address?: string;
    }) => {
      // Normalize phone to digits only format for database
      const normalizedPhone = businessData.owner_phone
        ? normalizePhoneDigits(businessData.owner_phone)
        : null;

      console.log("[Admin] Creating business:", {
        phone: normalizedPhone,
        email: businessData.owner_email || null,
        location: businessData.location_address
      });

      const { data, error } = await supabase
        .from("businesses")
        .insert([{
          name: businessData.name,
          type: businessData.type as any,
          description: businessData.description || null,
          category: businessData.category || null,
          image: businessData.image || null,
          owner_phone: normalizedPhone,
          owner_email: businessData.owner_email?.trim() || null,
          commission_rate: businessData.commission_rate || 15,
          location_lat: businessData.location_lat,
          location_lng: businessData.location_lng,
          location_address: businessData.location_address,
          is_active: true,
          featured: false,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Business created successfully! Owner can login with Phone OTP or Email/Google.");
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

// Toggle business approval
export const useToggleBusinessApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ businessId, isApproved }: { businessId: string; isApproved: boolean }) => {
      const { error } = await supabase
        .from("businesses")
        .update({ is_approved: isApproved })
        .eq("id", businessId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Business approval status updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update business approval: " + error.message);
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

// Assign rider to rider request
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

// Update rider request status
export const useUpdateRiderRequestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status, reason }: {
      requestId: string;
      status: string;
      reason?: string;
    }) => {
      const { error } = await supabase
        .from("rider_requests")
        .update({ status: status as any })
        .eq("id", requestId);

      if (error) throw error;

      if (status === 'cancelled' && reason) {
        await (supabase.from('order_status_logs' as any).insert({
          rider_request_id: requestId,
          status,
          notes: reason
        } as any) as any);
      }
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

// Fetch system settings
export const useSystemSettings = () => {
  return useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("system_settings" as any)
        .select("*") as any);

      if (error) throw error;
      return (data as any[]).reduce((acc: any, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
    },
  });
};

// Update system setting
export const useUpdateSystemSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await (supabase
        .from("system_settings" as any)
        .upsert({ key, value, updated_at: new Date().toISOString() } as any) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast.success("System setting updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update setting: " + error.message);
    },
  });
};

// Fetch order timeline
export const useOrderTimeline = (orderId?: string, riderRequestId?: string) => {
  return useQuery({
    queryKey: ["order-timeline", orderId, riderRequestId],
    queryFn: async () => {
      let query = (supabase
        .from("order_status_logs" as any)
        .select("*") as any)
        .order("created_at", { ascending: true });

      if (orderId) query = query.eq("order_id", orderId);
      if (riderRequestId) query = query.eq("rider_request_id", riderRequestId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!orderId || !!riderRequestId,
  });
};

// All admins manager
export const useAdminList = () => {
  return useQuery({
    queryKey: ["admin-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admins")
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


// ==========================================
// MENU ITEM MANAGEMENT
// ==========================================

// Update menu item
export const useUpdateMenuItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      updates
    }: {
      itemId: string;
      updates: {
        name?: string;
        description?: string;
        price?: number;
        category?: string;
        image?: string;
        is_available?: boolean;
        is_popular?: boolean;
      }
    }) => {
      const { error } = await supabase
        .from("menu_items")
        .update(updates)
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      toast.success("Menu item updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update menu item: " + error.message);
    },
  });
};

// ==========================================
// ORDER MANAGEMENT (ADMIN CONTROLS)
// ==========================================

// Accept order (admin manually accepts)
export const useAcceptOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({
          status: 'preparing',
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (error) throw error;

      // Create notification for customer
      const { data: order } = await supabase
        .from("orders")
        .select("customer_id")
        .eq("id", orderId)
        .single();

      if (order?.customer_id) {
        await supabase.rpc("send_system_notification", {
          _title: "Order Accepted",
          _message: "Your order has been accepted and is being prepared",
          _user_ids: [order.customer_id],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      toast.success("Order accepted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to accept order: " + error.message);
    },
  });
};

// Reject order (admin manually rejects)
export const useRejectOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      reason
    }: {
      orderId: string;
      reason?: string
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({
          status: 'cancelled',
          rejection_reason: reason || 'Order rejected by admin',
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (error) throw error;

      // Create notification for customer
      const { data: order } = await supabase
        .from("orders")
        .select("customer_id")
        .eq("id", orderId)
        .single();

      if (order?.customer_id) {
        await supabase.rpc("send_system_notification", {
          _title: "Order Cancelled",
          _message: reason || "Your order has been cancelled by the restaurant",
          _user_ids: [order.customer_id],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      toast.success("Order rejected successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to reject order: " + error.message);
    },
  });
};

// Confirm order payment manually (Admin)
export const useConfirmOrderPayment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: adminProfile } = useAdminList();

  return useMutation({
    mutationFn: async ({ paymentId, notes }: { paymentId: string; notes?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const currentAdmin = adminProfile?.find((a: any) => a.user_id === user?.id) as any;
      const adminName = currentAdmin?.name || user?.email || "Admin";

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

      const response = await fetch(`${backendUrl}/api/admin/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          payment_id: paymentId,
          notes,
          admin_name: adminName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to confirm payment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Payment confirmed and order updated to preparing!");
    },
    onError: (error: Error) => {
      toast.error("Confirmation failed: " + error.message);
    },
  });
};

// Fetch recent orders for dashboard
export const useRecentOrders = () => {
  return useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          total_amount,
          status,
          customer:customer_id(phone),
          rider:rider_id(name),
          business:businesses(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });
};
