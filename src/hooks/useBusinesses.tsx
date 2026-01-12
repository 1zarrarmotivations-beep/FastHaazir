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
      console.log('[Query] Fetching businesses, type:', type);
      
      // Use public view to avoid exposing sensitive owner data
      // CRITICAL: Only fetch active businesses for customer-facing pages
      let query = supabase
        .from('public_business_info')
        .select('*')
        .eq('is_active', true) // Only show active businesses
        .order('featured', { ascending: false })
        .order('rating', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Query] Error fetching businesses:', error);
        throw error;
      }

      console.log('[Query] Fetched businesses count:', data?.length);
      return data as Business[];
    },
    // Data stays fresh with realtime, no need for aggressive polling
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

export const useBusiness = (id: string) => {
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
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });
};
