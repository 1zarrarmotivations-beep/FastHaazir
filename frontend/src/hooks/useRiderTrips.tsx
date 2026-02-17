import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface RiderTrip {
    id: string;
    rider_id: string;
    start_time: string;
    end_time: string | null;
    distance_km: number;
    max_speed_kmh: number;
    avg_speed_kmh: number;
    start_lat: number | null;
    start_lng: number | null;
    end_lat: number | null;
    end_lng: number | null;
    metadata: Record<string, any>;
    created_at: string;
}

export const useRiderTrips = (limit = 20) => {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['rider-trips', user?.id, limit],
        queryFn: async () => {
            if (!user) throw new Error('Not authenticated');

            const { data: rider } = await supabase
                .from('riders')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!rider) throw new Error('Rider profile not found');

            const { data, error } = await supabase
                .from('rider_trips')
                .select('*')
                .eq('rider_id', rider.id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching rider trips:', error);
                throw error;
            }
            return data as RiderTrip[];
        },
        enabled: !!user?.id,
    });
};

export const useSaveRiderTrip = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (tripData: Omit<RiderTrip, 'id' | 'rider_id' | 'created_at'>) => {
            if (!user) throw new Error('Not authenticated');

            const { data: rider } = await supabase
                .from('riders')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!rider) throw new Error('Rider profile not found');

            const { data, error } = await supabase
                .from('rider_trips')
                .insert({
                    rider_id: rider.id,
                    ...tripData
                })
                .select()
                .single();

            if (error) {
                console.error('Error saving trip:', error);
                throw error;
            }
            return data as RiderTrip;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rider-trips'] });
            toast.success('Trip recorded successfully');
        },
        onError: (error: Error) => {
            toast.error('Failed to save trip: ' + error.message);
        }
    });
};
