import React, { useEffect, useState, useRef, useMemo } from 'react';
import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bike, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface LiveRiderTrackingMapProps {
  riderId: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryAddress: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupAddress?: string;
  status: string;
  fallbackEta?: string;
}

// Map Configuration
const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 30.1798,
  lng: 66.9750, // Quetta
};

const options = {
  disableDefaultUI: true,
  zoomControl: false,
};

// Utils
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculateLocalETA = (distanceKm: number): string => {
  const avgSpeedKmH = 25; // Average speed in city traffic
  const bufferMinutes = 2; // Small buffer for traffic/stops
  const travelTimeMinutes = (distanceKm / avgSpeedKmH) * 60;
  const totalMinutes = Math.ceil(travelTimeMinutes + bufferMinutes);

  if (totalMinutes < 1) return 'Arriving now';
  if (totalMinutes === 1) return '1 min away';
  if (totalMinutes < 60) return `${totalMinutes} min away`;

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins}m away`;
};


const LiveRiderTrackingMap = ({
  riderId,
  deliveryLat,
  deliveryLng,
  deliveryAddress,
  pickupLat,
  pickupLng,
  pickupAddress,
  status,
  fallbackEta = '25-35 min',
}: LiveRiderTrackingMapProps) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const queryClient = useQueryClient();

  // Fetch rider location
  const { data: riderLocation } = useQuery({
    queryKey: ['rider-location', riderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('riders')
        .select('current_location_lat, current_location_lng, name, is_online')
        .eq('id', riderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!riderId,
    refetchInterval: 5000,
  });

  // Calculate ETA & Distance
  const trackingInfo = useMemo(() => {
    if (!riderLocation?.current_location_lat || !riderLocation?.current_location_lng) {
      return { eta: fallbackEta, distance: null, isLive: false };
    }

    let destLat = deliveryLat;
    let destLng = deliveryLng;

    // If preparing, rider goes to pickup first
    if (status === 'preparing' && pickupLat && pickupLng) {
      destLat = pickupLat;
      destLng = pickupLng;
    }

    if (!destLat || !destLng) {
      return { eta: fallbackEta, distance: null, isLive: false };
    }

    const dist = calculateDistance(
      riderLocation.current_location_lat,
      riderLocation.current_location_lng,
      destLat,
      destLng
    );

    return {
      eta: calculateLocalETA(dist),
      distance: dist.toFixed(1),
      isLive: true,
    };
  }, [riderLocation, deliveryLat, deliveryLng, pickupLat, pickupLng, status, fallbackEta]);


  // Subscribe to Realtime Updates
  useEffect(() => {
    if (!riderId) return;

    const channel = supabase
      .channel(`rider-tracking-${riderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'riders',
          filter: `id=eq.${riderId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['rider-location', riderId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [riderId, queryClient]);


  // Fit Bounds
  useEffect(() => {
    if (mapRef.current && riderLocation?.current_location_lat && riderLocation?.current_location_lng) {
      const bounds = new google.maps.LatLngBounds();

      // Rider
      bounds.extend({ lat: riderLocation.current_location_lat, lng: riderLocation.current_location_lng });

      // Delivery
      if (deliveryLat && deliveryLng) {
        bounds.extend({ lat: deliveryLat, lng: deliveryLng });
      }

      // Pickup (if relevant)
      if (pickupLat && pickupLng) {
        bounds.extend({ lat: pickupLat, lng: pickupLng });
      }

      mapRef.current.fitBounds(bounds, 50); // Padding
    }
  }, [riderLocation, deliveryLat, deliveryLng, pickupLat, pickupLng]);


  const onLoad = React.useCallback(function callback(map: google.maps.Map) {
    mapRef.current = map;
  }, []);

  const onUnmount = React.useCallback(function callback(map: google.maps.Map) {
    mapRef.current = null;
  }, []);

  const isRiderOnline = riderLocation?.is_online;

  // Path Line
  const pathCoordinates = useMemo(() => {
    if (riderLocation?.current_location_lat && riderLocation?.current_location_lng && deliveryLat && deliveryLng) {
      return [
        { lat: riderLocation.current_location_lat, lng: riderLocation.current_location_lng },
        { lat: deliveryLat, lng: deliveryLng },
      ];
    }
    return [];
  }, [riderLocation, deliveryLat, deliveryLng]);

  return (
    <Card className="bg-card border-border overflow-hidden rounded-xl shadow-sm">
      <CardHeader className="py-3 px-4 flex-row items-center justify-between border-b border-border/50 bg-muted/20">
        <CardTitle className="text-sm flex items-center gap-2 font-semibold">
          <Bike className="w-4 h-4 text-primary" />
          Live Tracking
        </CardTitle>
        <Badge variant={isRiderOnline ? 'default' : 'secondary'} className="text-[10px] h-5 px-2">
          {isRiderOnline ? '● Live' : '○ Offline'}
        </Badge>
      </CardHeader>

      <CardContent className="p-0 relative">
        <div className="h-64 w-full">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={13}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={options}
          >
            {/* Rider Marker */}
            {riderLocation?.current_location_lat && riderLocation?.current_location_lng && (
              <MarkerF
                position={{ lat: riderLocation.current_location_lat, lng: riderLocation.current_location_lng }}
                icon={{
                  url: 'https://cdn-icons-png.flaticon.com/512/3448/3448636.png', // Or custom bike icon
                  scaledSize: new google.maps.Size(40, 40),
                }}
                animation={google.maps.Animation.DROP}
              />
            )}

            {/* Delivery Marker */}
            {deliveryLat && deliveryLng && (
              <MarkerF
                position={{ lat: deliveryLat, lng: deliveryLng }}
                label={{ text: "📍", className: "text-lg" }}
              />
            )}

            {/* Pickup Marker */}
            {pickupLat && pickupLng && (
              <MarkerF
                position={{ lat: pickupLat, lng: pickupLng }}
                label={{ text: "🏪", className: "text-lg" }}
              />
            )}

            {/* Route Line */}
            {pathCoordinates.length > 0 && (
              <PolylineF
                path={pathCoordinates}
                options={{
                  strokeColor: "#3b82f6",
                  strokeOpacity: 0.8,
                  strokeWeight: 4,
                  geodesic: true,
                  icons: [{
                    icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                    offset: '100%',
                    repeat: '100px'
                  }]
                }}
              />
            )}

          </GoogleMap>
        </div>

        {/* Floating ETA Card */}
        <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur-md border border-border/50 rounded-lg p-3 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                {status === 'preparing' ? 'Pickup ETA' : 'Delivery ETA'}
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-foreground lead-none">{trackingInfo.eta}</span>
                {trackingInfo.distance && <span className="text-xs text-muted-foreground">({trackingInfo.distance} km)</span>}
              </div>
            </div>
          </div>
          {trackingInfo.isLive && (
            <div className="animate-pulse flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
};

export default LiveRiderTrackingMap;