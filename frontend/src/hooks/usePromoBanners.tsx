import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface PromoBanner {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  location: 'home' | 'category';
  category_id: string | null;
  style_config: {
    gradient?: string;
    overlayOpacity?: number;
    textColor?: string;
    icon?: string;
  };
  action_type: 'link' | 'store' | 'product';
  action_value: string | null;
  is_active: boolean;
  display_order: number;

  // Date fields (handle both naming conventions)
  starts_at?: string | null;
  ends_at?: string | null;
  start_date?: string | null;
  end_date?: string | null;

  // Additional fields for BannersManager
  heading_en?: string;
  heading_ur?: string;
  description_en?: string;
  description_ur?: string;
  subtitle_en?: string;
  subtitle_ur?: string;
  button_text_en?: string;
  button_text_ur?: string;
  icon?: string;
  background_type?: string;
  background_value?: string;
  click_action?: string;
  external_url?: string;
  business_id?: string;
}

// Fetch active banners for a specific location
export function useActivePromoBanners(location: 'home' | 'category' = 'home', categoryId?: string) {
  return useQuery({
    queryKey: ['promo-banners-active', location, categoryId],
    queryFn: async () => {
      const now = new Date().toISOString();

      let query = supabase
        .from('promo_banners')
        .select('*')
        .eq('is_active', true)
        .eq('location', location)
        .or(`starts_at.is.null,starts_at.lte.${now},start_date.is.null,start_date.lte.${now}`) // Check both date fields
        .or(`ends_at.is.null,ends_at.gte.${now},end_date.is.null,end_date.gte.${now}`) // Check both date fields
        .order('display_order', { ascending: true });

      if (location === 'category' && categoryId) {
        query = query.or(`category_id.eq.${categoryId},category_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useActivePromoBanners] Error:', error);
        throw error;
      }

      // Client-side filter for dates just to be safe
      const filteredBanners = (data || []).map(b => ({
        ...b,
        style_config: typeof b.style_config === 'string' ? JSON.parse(b.style_config) : b.style_config
      })).filter((banner: any) => {
        const start = banner.starts_at || banner.start_date;
        const end = banner.ends_at || banner.end_date;

        const startValid = !start || new Date(start) <= new Date();
        const endValid = !end || new Date(end) >= new Date();
        return startValid && endValid;
      });

      return filteredBanners as PromoBanner[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    refetchOnWindowFocus: true,
  });
}

// Admin hook to fetch ALL banners
export function useAllPromoBannersAdmin() {
  return useQuery({
    queryKey: ['promo-banners-all-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      return (data || []).map(b => ({
        ...b,
        style_config: typeof b.style_config === 'string' ? JSON.parse(b.style_config) : b.style_config
      })) as PromoBanner[];
    }
  });
}

// Hook to fetch businesses for banner linkage
export function useBusinessesForBanner() {
  return useQuery({
    queryKey: ['admin-businesses-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data;
    }
  });
}
