/**
 * useRiderLocation — Rider GPS tracking (upgraded)
 * ─────────────────────────────────────────────────────────────────
 * Now delegates GPS management to useLocationService (single watch,
 * heartbeat, movement filter) and useRealtimeSync (DB writes, heartbeat).
 * This hook is a thin adapter kept for backward-compatible API.
 */
import { useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLocationService, LiveLocation, LocationStatus } from './useLocationService';
import { useRealtimeSync } from './useRealtimeSync';

export type { LiveLocation, LocationStatus };

// ── Hook for rider's own tracking ──────────────────────────────
export const useRiderLocation = (riderId: string | undefined, isOnline: boolean) => {
  const queryClient = useQueryClient();

  const updateLocationMutation = useMutation({
    mutationFn: async (loc: LiveLocation) => {
      if (!riderId) throw new Error('No rider ID');
      const { error } = await supabase
        .from('riders')
        .update({
          current_location_lat: loc.lat,
          current_location_lng: loc.lng,
          current_speed: loc.speed ?? 0,
          heading: loc.heading,
          updated_at: new Date().toISOString(),
        })
        .eq('id', riderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-riders'] });
      queryClient.invalidateQueries({ queryKey: ['rider-location', riderId] });
    },
    onError: (err) => {
      console.error('[useRiderLocation] Location write failed:', err);
    },
  });

  const handleLocationError = useCallback(
    (status: string, message: string) => {
      if (status === 'permission_denied') {
        toast.error('Location access denied. Enable location for live tracking.');
      } else if (status === 'signal_lost') {
        console.warn('[useRiderLocation] Signal lost:', message);
      }
    },
    []
  );

  // GPS backbone — single watch per lifecycle
  // Note: We don't use onUpdate here because useRealtimeSync handles DB writes
  // This avoids duplicate writes to the database
  const { status, location: lastLocation, retryPermission } = useLocationService({
    enabled: !!riderId && isOnline,
    minMovement: 2,           // Ignore <2m movement (GPS jitter)
    heartbeatTimeout: 15_000, // Signal lost after 15s silence
    onError: handleLocationError,
  });

  // Online presence + heartbeat sync
  useRealtimeSync({
    riderId,
    isOnline,
    currentLocation: lastLocation,
  });

  return {
    isTracking: status === 'tracking' || status === 'calibrating',
    locationStatus: status,
    lastLocation,
    retryPermission,
    updateLocation: updateLocationMutation.mutate,
  };
};

// ── Hook for customers/admin tracking a specific rider ──────────
export const useRiderCurrentLocation = (riderId: string | undefined) => {
  const queryClient = useQueryClient();

  // Real-time subscription to rider row changes
  // (In a real hook we'd use useEffect — but using query polling here
  //  because the hook must return useQuery directly)

  return useQuery({
    queryKey: ['rider-location', riderId],
    queryFn: async () => {
      if (!riderId) return null;

      const { data, error } = await supabase.rpc('get_rider_public_info', {
        rider_uuid: riderId,
      });

      if (error) {
        console.error('[useRiderCurrentLocation] Error:', error);
        throw error;
      }

      if (!data || data.length === 0) return null;

      return {
        lat: data[0].current_location_lat,
        lng: data[0].current_location_lng,
        name: data[0].name,
        vehicle_type: data[0].vehicle_type,
        is_online: data[0].is_online,
      };
    },
    enabled: !!riderId,
    refetchInterval: 5_000,
    staleTime: 3_000,
  });
};
