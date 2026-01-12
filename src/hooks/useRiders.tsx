import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Rider {
  id: string;
  name: string;
  vehicle_type: string;
  rating: number;
  total_trips: number;
  is_online: boolean;
  image: string | null;
  current_location_lat?: number | null;
  current_location_lng?: number | null;
}

export const useOnlineRiders = () => {
  const queryClient = useQueryClient();

  // Set up realtime subscription for rider online status changes
  useEffect(() => {
    console.log('[useOnlineRiders] Setting up realtime subscription for riders');
    
    const channel = supabase
      .channel('online-riders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'riders',
        },
        (payload) => {
          console.log('[useOnlineRiders] Rider changed:', payload);
          // Invalidate query to refresh online riders list
          queryClient.invalidateQueries({ queryKey: ['online-riders'] });
        }
      )
      .subscribe();

    return () => {
      console.log('[useOnlineRiders] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['online-riders'],
    queryFn: async () => {
      console.log('[useOnlineRiders] Fetching online riders via RPC...');
      
      // Use the SECURITY DEFINER function to get online riders
      // This bypasses RLS so customers can see available riders
      const { data, error } = await supabase.rpc('get_online_riders');

      if (error) {
        console.error('[useOnlineRiders] RPC Error:', error);
        
        // Fallback to view if RPC fails (for backward compatibility)
        console.log('[useOnlineRiders] Falling back to view...');
        const { data: viewData, error: viewError } = await supabase
          .from('public_rider_info')
          .select('*')
          .order('rating', { ascending: false });

        if (viewError) {
          console.error('[useOnlineRiders] View Error:', viewError);
          throw viewError;
        }

        const validRiders = (viewData || [])
          .filter((rider): rider is typeof rider & { id: string; name: string } => 
            rider.id !== null && rider.name !== null
          )
          .map(rider => ({
            id: rider.id,
            name: rider.name,
            vehicle_type: rider.vehicle_type || 'Bike',
            rating: rider.rating || 4.5,
            total_trips: rider.total_trips || 0,
            is_online: rider.is_online ?? true,
            image: rider.image,
            current_location_lat: rider.current_location_lat,
            current_location_lng: rider.current_location_lng,
          }));

        console.log('[useOnlineRiders] Fallback riders found:', validRiders.length);
        return validRiders as Rider[];
      }

      // Process RPC result
      const validRiders = (data || [])
        .filter((rider: any): rider is { id: string; name: string } & Record<string, any> => 
          rider.id !== null && rider.name !== null
        )
        .map((rider: any) => ({
          id: rider.id,
          name: rider.name,
          vehicle_type: rider.vehicle_type || 'Bike',
          rating: rider.rating || 4.5,
          total_trips: rider.total_trips || 0,
          is_online: rider.is_online ?? true,
          image: rider.image,
          current_location_lat: rider.current_location_lat,
          current_location_lng: rider.current_location_lng,
        }));

      console.log('[useOnlineRiders] Online riders found:', validRiders.length);
      
      // Log debug info if no riders found
      if (validRiders.length === 0) {
        console.warn('[useOnlineRiders] ⚠️ No online riders available. Check:');
        console.warn('  - Are riders set to online in their dashboard?');
        console.warn('  - Are riders active and not blocked?');
      }
      
      return validRiders as Rider[];
    },
    refetchInterval: 5000, // Poll every 5 seconds for faster updates
    staleTime: 2000, // Consider data stale after 2 seconds
  });
};

// Hook to get a specific rider's public info
export const useRiderPublicInfo = (riderId: string | undefined) => {
  return useQuery({
    queryKey: ['rider-public-info', riderId],
    queryFn: async () => {
      if (!riderId) return null;
      
      const { data, error } = await supabase.rpc('get_rider_public_info', {
        rider_uuid: riderId
      });

      if (error) {
        console.error('[useRiderPublicInfo] Error:', error);
        throw error;
      }

      if (!data || data.length === 0) return null;

      const rider = data[0];
      return {
        id: rider.id,
        name: rider.name,
        vehicle_type: rider.vehicle_type || 'Bike',
        rating: rider.rating || 4.5,
        total_trips: rider.total_trips || 0,
        is_online: rider.is_online ?? false,
        image: rider.image,
        current_location_lat: rider.current_location_lat,
        current_location_lng: rider.current_location_lng,
      } as Rider;
    },
    enabled: !!riderId,
  });
};
