import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MenuItem {
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

export interface MenuCategory {
  category: string;
  items: MenuItem[];
}

export const useMenuItems = (businessId: string) => {
  return useQuery({
    queryKey: ['menu-items', businessId],
    queryFn: async () => {
      console.log('[Query] Fetching menu items for business:', businessId);
      
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_available', true) // Only show available items to customers
        .order('is_popular', { ascending: false })
        .order('category')
        .order('name');

      if (error) {
        console.error('[Query] Error fetching menu items:', error);
        throw error;
      }

      console.log('[Query] Fetched menu items count:', data?.length);

      // Group by category dynamically - NO hardcoded categories
      const grouped = (data as MenuItem[]).reduce((acc, item) => {
        const category = item.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {} as Record<string, MenuItem[]>);

      // Convert to array format, sorted by category name
      const categories = Object.entries(grouped)
        .map(([category, items]) => ({
          category,
          items,
        }))
        .sort((a, b) => {
          // Put "Popular" or "Featured" first if exists
          if (a.category.toLowerCase().includes('popular')) return -1;
          if (b.category.toLowerCase().includes('popular')) return 1;
          return a.category.localeCompare(b.category);
        });

      console.log('[Query] Menu categories:', categories.map(c => c.category));
      return categories as MenuCategory[];
    },
    enabled: !!businessId,
    // Keep menu data fresh
    staleTime: 10000, // 10 seconds
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Fallback refetch every 30 seconds
  });
};
