import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export type BusinessType = 'restaurant' | 'bakery' | 'grocery' | 'shop';

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  image: string | null;
  rating: number;
  eta: string;
  distance: string;
  category: string | null;
  description: string | null;
  featured: boolean;
  is_active: boolean;
}

// Debug info interface for troubleshooting
export interface BusinessDebugInfo {
  totalInDb: number;
  activeCount: number;
  filteredByType: number;
  filteredOut: Array<{
    id: string;
    name: string;
    reason: string;
    type: string;
    is_active: boolean;
  }>;
}

export const useBusinesses = (type?: BusinessType) => {
  const queryClient = useQueryClient();

  // Set up realtime subscription for businesses
  useEffect(() => {
    console.log('[useBusinesses] Setting up realtime subscription for businesses, type:', type);
    
    const channel = supabase
      .channel(`businesses-realtime-${type || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'businesses',
        },
        (payload) => {
          console.log('[useBusinesses] Business changed:', payload);
          // Invalidate query to refresh businesses list
          queryClient.invalidateQueries({ queryKey: ['businesses', type] });
          queryClient.invalidateQueries({ queryKey: ['businesses'] });
          queryClient.invalidateQueries({ queryKey: ['businesses-debug'] });
        }
      )
      .subscribe();

    return () => {
      console.log('[useBusinesses] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient, type]);

  return useQuery({
    queryKey: ['businesses', type],
    queryFn: async () => {
      console.log('[useBusinesses] Fetching businesses, requested type:', type);
      
      // FIXED: Query directly from 'businesses' table instead of 'public_business_info' view
      // The view may have RLS policies or data issues preventing customer access
      // We only select non-sensitive fields (excluding owner_phone, owner_email, owner_user_id)
      let query = supabase
        .from('businesses')
        .select('id, name, type, image, rating, eta, distance, category, description, featured, is_active')
        .eq('is_active', true) // Only show active businesses
        .order('featured', { ascending: false })
        .order('rating', { ascending: false, nullsFirst: false });

      if (type) {
        // Case-insensitive type matching - normalize to lowercase
        const normalizedType = type.toLowerCase();
        console.log('[useBusinesses] Filtering by type:', normalizedType);
        query = query.eq('type', normalizedType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useBusinesses] Error fetching businesses:', error);
        
        // Fallback: Try the view if direct table access fails (RLS might block)
        console.log('[useBusinesses] Trying fallback to public_business_info view...');
        let fallbackQuery = supabase
          .from('public_business_info')
          .select('*')
          .eq('is_active', true)
          .order('featured', { ascending: false })
          .order('rating', { ascending: false });
        
        if (type) {
          fallbackQuery = fallbackQuery.eq('type', type.toLowerCase());
        }
        
        const fallbackResult = await fallbackQuery;
        if (fallbackResult.error) {
          console.error('[useBusinesses] Fallback also failed:', fallbackResult.error);
          throw error; // Throw original error
        }
        
        console.log('[useBusinesses] Fallback succeeded, count:', fallbackResult.data?.length);
        return (fallbackResult.data || []) as Business[];
      }

      console.log('[useBusinesses] Fetched businesses:', {
        count: data?.length,
        type: type,
        businesses: data?.map(b => ({ id: b.id, name: b.name, type: b.type, is_active: b.is_active }))
      });
      
      return (data || []) as Business[];
    },
    // Data stays fresh with realtime, no need for aggressive polling
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

// Debug hook - shows why businesses might be hidden (admin/dev use only)
export const useBusinessesDebug = (requestedType?: BusinessType) => {
  return useQuery({
    queryKey: ['businesses-debug', requestedType],
    queryFn: async (): Promise<BusinessDebugInfo> => {
      console.log('[useBusinessesDebug] Running debug query...');
      
      // Fetch ALL businesses without filters
      const { data: allBusinesses, error } = await supabase
        .from('businesses')
        .select('id, name, type, is_active, image, category')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[useBusinessesDebug] Error:', error);
        return {
          totalInDb: 0,
          activeCount: 0,
          filteredByType: 0,
          filteredOut: [],
        };
      }

      const businesses = allBusinesses || [];
      const totalInDb = businesses.length;
      const activeBusinesses = businesses.filter(b => b.is_active === true);
      const activeCount = activeBusinesses.length;
      
      // Filter by type if specified
      const normalizedType = requestedType?.toLowerCase();
      const matchingType = normalizedType 
        ? activeBusinesses.filter(b => b.type?.toLowerCase() === normalizedType)
        : activeBusinesses;
      const filteredByType = matchingType.length;

      // Find businesses that are filtered out and why
      const filteredOut = businesses
        .filter(b => {
          // If it would NOT show to customer, include it in filtered out list
          if (!b.is_active) return true;
          if (normalizedType && b.type?.toLowerCase() !== normalizedType) return true;
          return false;
        })
        .map(b => ({
          id: b.id,
          name: b.name,
          type: b.type || 'unknown',
          is_active: b.is_active,
          reason: !b.is_active 
            ? 'INACTIVE (is_active = false)' 
            : `TYPE_MISMATCH (type="${b.type}" but requested="${requestedType}")`
        }));

      const debugInfo: BusinessDebugInfo = {
        totalInDb,
        activeCount,
        filteredByType,
        filteredOut,
      };

      console.log('[useBusinessesDebug] Debug info:', debugInfo);
      return debugInfo;
    },
    staleTime: 10000,
  });
};

export const useBusiness = (id: string) => {
  const queryClient = useQueryClient();

  // Set up realtime subscription for single business
  useEffect(() => {
    if (!id) return;
    
    console.log('[useBusiness] Setting up realtime subscription for business:', id);
    
    const channel = supabase
      .channel(`business-realtime-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'businesses',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('[useBusiness] Business changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['business', id] });
        }
      )
      .subscribe();

    return () => {
      console.log('[useBusiness] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient, id]);

  return useQuery({
    queryKey: ['business', id],
    queryFn: async () => {
      console.log('[Query] Fetching single business:', id);
      
      // Use public view to avoid exposing sensitive owner data
      const { data, error } = await supabase
        .from('public_business_info')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[Query] Error fetching business:', error);
        throw error;
      }

      return data as Business | null;
    },
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
};
