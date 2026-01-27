import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface PromoBanner {
  id: string;
  heading_en: string;
  heading_ur: string;
  description_en: string | null;
  description_ur: string | null;
  icon: string | null;
  background_type: 'gradient' | 'image';
  background_value: string;
  is_active: boolean;
  click_action: 'none' | 'restaurants' | 'categories' | 'external';
  external_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function usePromoBanner() {
  const query = useQuery({
    queryKey: ['promo-banner-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        // No active banner is not an error
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data as PromoBanner;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('promo-banner-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'promo_banners',
        },
        () => {
          // Refetch when any banner changes
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query]);

  return query;
}

// Admin hook to fetch ALL banners (not just active)
export function useAllPromoBanners() {
  const query = useQuery({
    queryKey: ['promo-banners-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as PromoBanner[];
    },
    staleTime: 1000 * 30, // 30 seconds for admin
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('promo-banners-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'promo_banners',
        },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query]);

  return query;
}
