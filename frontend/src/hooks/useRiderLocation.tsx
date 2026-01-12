import { useEffect, useRef, useCallback, useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface LocationUpdate {
  lat: number;
  lng: number;
}

// Hook to track and update rider's live location
export const useRiderLocation = (riderId: string | undefined, isOnline: boolean) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationUpdate | null>(null);
  const UPDATE_INTERVAL = 5000; // Update every 5 seconds for more real-time tracking

  const updateLocationMutation = useMutation({
    mutationFn: async ({ lat, lng }: LocationUpdate) => {
      if (!riderId) throw new Error('No rider ID');

      console.log('[useRiderLocation] Updating location:', { lat, lng, riderId });

      const { error } = await supabase
        .from('riders')
        .update({
          current_location_lat: lat,
          current_location_lng: lng,
          updated_at: new Date().toISOString(),
        })
        .eq('id', riderId);

      if (error) {
        console.error('[useRiderLocation] Update error:', error);
        throw error;
      }

      console.log('[useRiderLocation] Location updated successfully');
    },
    onSuccess: (_, variables) => {
      setLastLocation(variables);
      // Invalidate rider queries to update map views
      queryClient.invalidateQueries({ queryKey: ['online-riders'] });
      queryClient.invalidateQueries({ queryKey: ['rider-location', riderId] });
    },
    onError: (error) => {
      console.error('[useRiderLocation] Failed to update location:', error);
    },
  });

  const handlePositionUpdate = useCallback(
    (position: GeolocationPosition) => {
      const now = Date.now();
      
      // Throttle updates to prevent overwhelming the database
      if (now - lastUpdateRef.current < UPDATE_INTERVAL) return;
      
      lastUpdateRef.current = now;
      
      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      
      console.log('[useRiderLocation] Position received:', newLocation);
      updateLocationMutation.mutate(newLocation);
    },
    [updateLocationMutation]
  );

  const handlePositionError = useCallback((error: GeolocationPositionError) => {
    console.error('[useRiderLocation] Geolocation error:', error);
    if (error.code === error.PERMISSION_DENIED) {
      toast.error('Location access denied. Enable location for live tracking.');
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      toast.error('Location unavailable. Check your GPS settings.');
    } else if (error.code === error.TIMEOUT) {
      console.warn('[useRiderLocation] Location timeout, will retry...');
    }
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    console.log('[useRiderLocation] Starting location tracking...');
    setIsTracking(true);

    // Get initial position immediately
    navigator.geolocation.getCurrentPosition(
      handlePositionUpdate,
      handlePositionError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // Watch position changes continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        maximumAge: 3000, // Accept positions up to 3 seconds old
        timeout: 20000,
      }
    );

    console.log('[useRiderLocation] Watch ID:', watchIdRef.current);
  }, [handlePositionUpdate, handlePositionError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      console.log('[useRiderLocation] Stopping location tracking...');
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
    }
  }, []);

  // Start/stop tracking based on online status
  useEffect(() => {
    if (riderId && isOnline) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => stopTracking();
  }, [riderId, isOnline, startTracking, stopTracking]);

  // Also use interval-based updates as backup
  useEffect(() => {
    if (!riderId || !isOnline) return;

    const intervalUpdate = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          handlePositionUpdate,
          (err) => console.warn('[useRiderLocation] Interval update failed:', err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    }, UPDATE_INTERVAL);

    return () => clearInterval(intervalUpdate);
  }, [riderId, isOnline, handlePositionUpdate]);

  return {
    isTracking,
    lastLocation,
    updateLocation: updateLocationMutation.mutate,
  };
};

// Hook to get a rider's current location (for customers/admin)
export const useRiderCurrentLocation = (riderId: string | undefined) => {
  const queryClient = useQueryClient();

  // Subscribe to real-time updates
  useEffect(() => {
    if (!riderId) return;

    console.log('[useRiderCurrentLocation] Subscribing to rider location:', riderId);

    const channel = supabase
      .channel(`rider-location-${riderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'riders',
          filter: `id=eq.${riderId}`,
        },
        (payload) => {
          console.log('[useRiderCurrentLocation] Rider location updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['rider-location', riderId] });
          queryClient.invalidateQueries({ queryKey: ['rider-public-info', riderId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [riderId, queryClient]);

  // Query for the rider's current location
  return useQuery({
    queryKey: ['rider-location', riderId],
    queryFn: async () => {
      if (!riderId) return null;

      // Use the RPC function to get public rider info
      const { data, error } = await supabase.rpc('get_rider_public_info', {
        rider_uuid: riderId
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
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 3000,
  });
};
