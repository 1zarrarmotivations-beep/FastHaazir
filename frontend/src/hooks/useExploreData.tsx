import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExploreBanner {
    id: string;
    title: string;
    subtitle: string;
    image_url: string;
    redirect_type: 'store' | 'category' | 'offer' | 'url';
    redirect_id: string;
}

export interface ExploreOffer {
    id: string;
    title: string;
    description: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    store_id: string;
    image_url: string;
    store?: {
        name: string;
        image: string;
    };
}

export interface ExploreCategory {
    id: string;
    name: string;
    name_ur: string;
    image_url: string;
    slug: string;
}

export interface ExploreStore {
    id: string;
    name: string;
    rating: number;
    total_orders: number;
    delivery_time_mins: number;
    image: string;
    type: string;
    is_open: boolean;
    is_featured: boolean;
}

export const useExploreData = () => {
    // 1. Banners (using the robust promo_banners table)
    const bannersQuery = useQuery({
        queryKey: ['explore-banners'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('promo_banners')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true });
            if (error) throw error;

            return data.map(b => ({
                id: b.id,
                title: b.heading_en,
                subtitle: b.subtitle_en,
                image_url: b.background_type === 'image' ? b.background_value : '',
                gradient: b.background_type === 'gradient' ? b.background_value : '',
                icon: b.icon,
                redirect_type: b.click_action,
                redirect_id: b.business_id || b.external_url
            })) as any[];
        }
    });

    // 2. Categories (General categories from categories table where business_id is null or global)
    // For now, we take all active categories
    const categoriesQuery = useQuery({
        queryKey: ['explore-categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('categories')
                .select('id, name, name_ur, image_url, slug')
                .eq('is_active', true)
                .order('sort_order', { ascending: true })
                .limit(8);
            if (error) throw error;
            return data as ExploreCategory[];
        }
    });

    // 3. Trending Stores (based on total_orders and rating)
    const trendingQuery = useQuery({
        queryKey: ['explore-trending'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('businesses')
                .select('id, name, rating, total_orders, delivery_time_mins, image, type, is_open, is_featured')
                .eq('is_active', true)
                .eq('is_approved', true)
                .order('total_orders', { ascending: false })
                .order('rating', { ascending: false })
                .limit(10);
            if (error) throw error;
            return data as ExploreStore[];
        }
    });

    // 4. Offers
    const offersQuery = useQuery({
        queryKey: ['explore-offers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('offers')
                .select('*, store:businesses(name, image)')
                .eq('active', true)
                .gt('valid_until', new Date().toISOString())
                .order('priority', { ascending: false });
            if (error) throw error;
            return data as any[];
        }
    });

    return {
        banners: bannersQuery.data ?? [],
        categories: categoriesQuery.data ?? [],
        trending: trendingQuery.data ?? [],
        offers: offersQuery.data ?? [],
        isLoading: bannersQuery.isLoading || categoriesQuery.isLoading || trendingQuery.isLoading || offersQuery.isLoading,
        refetch: () => {
            bannersQuery.refetch();
            categoriesQuery.refetch();
            trendingQuery.refetch();
            offersQuery.refetch();
        }
    };
};
