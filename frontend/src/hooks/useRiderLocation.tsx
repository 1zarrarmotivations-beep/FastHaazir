import { useEffect, useRef, useCallback, useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';

interface LocationUpdate {
  lat: number;
  lng: number;
}

export type LocationPermissionStatus = 'prompt' | 'granted' | 'denied';

// Hook to track and update rider's live location
export const useRiderLocation = (riderId: string | undefined, isOnline: boolean) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const watchIdRef = useRef<string | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationUpdate | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>('prompt');
  const [isLocationEnabled, setIsLocationEnabled] = useState(true); // Assume true initially

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
    (position: any) => {
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

  const checkPermissions = useCallback(async () => {
    try {
      const permission = await Geolocation.checkPermissions();
      console.log('[useRiderLocation] Permission status:', permission);
      setPermissionStatus(permission.location as LocationPermissionStatus);

      // Check if location service is enabled (GPS is on)
      // Note: Capacitor Geolocation doesn't strictly have "checkServiceEnabled", 
      // but getCurrentPosition throws if disabled.
      // We can try getting a quick position to verify.
      try {
        await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 2000 });
        setIsLocationEnabled(true);
      } catch (e: any) {
        console.warn('[useRiderLocation] Location service check failed:', e);
        if (e.message.includes('Location services are not enabled')) {
          setIsLocationEnabled(false);
        }
      }

      return permission.location;
    } catch (error) {
      console.error('[useRiderLocation] Error checking permissions:', error);
      return 'denied';
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      const permission = await Geolocation.requestPermissions();
      setPermissionStatus(permission.location as LocationPermissionStatus);
      return permission.location;
    } catch (error) {
      console.error('[useRiderLocation] Error requesting permissions:', error);
      return 'denied';
    }
  }, []);

  const startTracking = useCallback(async () => {
    try {
      // First check permissions
      const perm = await checkPermissions();
      if (perm !== 'granted') {
        const newPerm = await requestPermissions();
        if (newPerm !== 'granted') {
          toast.error('Location permission required for rider tracking');
          return;
        }
      }

      console.log('[useRiderLocation] Starting location tracking...');
      setIsTracking(true);

      // Clear existing watch if any
      if (watchIdRef.current) {
        Geolocation.clearWatch({ id: watchIdRef.current });
      }

      // Watch position changes continuously
      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 3000,
        },
        (position, err) => {
          if (err) {
            console.error('[useRiderLocation] Watch error:', err);
            if (err.message.includes('Location services are not enabled')) {
              setIsLocationEnabled(false);
              toast.error('Please enable GPS location');
            }
            return;
          }
          if (position) {
            setIsLocationEnabled(true);
            handlePositionUpdate(position);
          }
        }
      );

      watchIdRef.current = watchId;
      console.log('[useRiderLocation] Watch ID:', watchId);

    } catch (error) {
      console.error('[useRiderLocation] Error starting tracking:', error);
      toast.error('Failed to start location tracking');
    }
  }, [checkPermissions, requestPermissions, handlePositionUpdate]);

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      console.log('[useRiderLocation] Stopping location tracking...');
      try {
        await Geolocation.clearWatch({ id: watchIdRef.current });
      } catch (ignore) { }
      watchIdRef.current = null;
      setIsTracking(false);
    }
  }, []);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();

    // Re-check when app resumes
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        checkPermissions();
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [checkPermissions]);

  // Start/stop tracking based on online status
  useEffect(() => {
    if (riderId && isOnline) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => { stopTracking(); };
  }, [riderId, isOnline, startTracking, stopTracking]);

  return {
    isTracking,
    lastLocation,
    permissionStatus,
    isLocationEnabled,
    checkPermissions,
    requestPermissions,
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
