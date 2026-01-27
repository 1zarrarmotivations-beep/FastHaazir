import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface PromoBanner {
  id: string;
  heading_en: string;
  heading_ur: string;
  description_en: string | null;
  description_ur: string | null;
  subtitle_en: string | null;
  subtitle_ur: string | null;
  button_text_en: string | null;
  button_text_ur: string | null;
  icon: string | null;
  background_type: 'gradient' | 'image';
  background_value: string;
  is_active: boolean;
  click_action: 'none' | 'restaurants' | 'categories' | 'external' | 'business';
  external_url: string | null;
  business_id: string | null;
  display_order: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch multiple active banners within schedule for carousel
export function useActivePromoBanners() {
  const query = useQuery({
    queryKey: ['promo-banners-active-carousel'],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[useActivePromoBanners] Error:', error);
        throw error;
      }

      // Filter banners that are within their schedule
      const filteredBanners = (data || []).filter((banner: PromoBanner) => {
        const startValid = !banner.start_date || new Date(banner.start_date) <= new Date();
        const endValid = !banner.end_date || new Date(banner.end_date) >= new Date();
        return startValid && endValid;
      });

      return filteredBanners as PromoBanner[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    refetchOnWindowFocus: true,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('promo-banners-carousel')
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

// Admin hook to fetch ALL banners with business info
export function useAllPromoBannersAdmin() {
  const query = useQuery({
    queryKey: ['promo-banners-all-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_banners')
        .select(`
          *,
          business:businesses(id, name, image)
        `)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as (PromoBanner & { business?: { id: string; name: string; image: string | null } })[];
    },
    staleTime: 1000 * 30, // 30 seconds for admin
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('promo-banners-admin-all')
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

// Fetch businesses for linking
export function useBusinessesForBanner() {
  return useQuery({
    queryKey: ['businesses-for-banner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_businesses')
        .select('id, name, image, type')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
