import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

// Calculate distance using Haversine formula
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

// Calculate ETA based on distance and average speed
const calculateETA = (distanceKm: number): { minutes: number; text: string } => {
  const avgSpeedKmH = 25; // Average speed in city traffic
  const bufferMinutes = 2; // Small buffer for traffic/stops

  const travelTimeMinutes = (distanceKm / avgSpeedKmH) * 60;
  const totalMinutes = Math.ceil(travelTimeMinutes + bufferMinutes);

  if (totalMinutes < 1) {
    return { minutes: 1, text: 'Arriving now' };
  } else if (totalMinutes === 1) {
    return { minutes: 1, text: '1 min away' };
  } else if (totalMinutes < 60) {
    return { minutes: totalMinutes, text: `${totalMinutes} min away` };
  } else {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return { minutes: totalMinutes, text: `${hours}h ${mins}m away` };
  }
};

const createRiderIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pulse 2s infinite;
      ">
        <span style="font-size: 18px;">🏍️</span>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      </style>
    `,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const createDeliveryIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        background: linear-gradient(135deg, #22c55e, #16a34a);
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 14px;">📍</span>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

const createPickupIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        background: linear-gradient(135deg, #f97316, #ea580c);
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 14px;">🏪</span>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const queryClient = useQueryClient();

  // Quetta default
  const defaultLat = 30.1798;
  const defaultLng = 66.9750;

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
    refetchInterval: 5000, // Fallback polling every 5 seconds
  });

  // Calculate dynamic ETA
  const etaInfo = useMemo(() => {
    if (!riderLocation?.current_location_lat || !riderLocation?.current_location_lng) {
      return { text: fallbackEta, isLive: false, distance: null };
    }

    // Determine destination based on status
    let destLat = deliveryLat;
    let destLng = deliveryLng;

    // If status is preparing, rider goes to pickup first
    if (status === 'preparing' && pickupLat && pickupLng) {
      destLat = pickupLat;
      destLng = pickupLng;
    }

    if (!destLat || !destLng) {
      return { text: fallbackEta, isLive: false, distance: null };
    }

    const distance = calculateDistance(
      Number(riderLocation.current_location_lat),
      Number(riderLocation.current_location_lng),
      destLat,
      destLng
    );

    const eta = calculateETA(distance);
    return { text: eta.text, isLive: true, distance: distance.toFixed(1) };
  }, [riderLocation, deliveryLat, deliveryLng, pickupLat, pickupLng, status, fallbackEta]);

  // Subscribe to realtime updates
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
          console.log('Rider location updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['rider-location', riderId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [riderId, queryClient]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([defaultLat, defaultLng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(mapRef.current);

    L.control.zoom({ position: 'topright' }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers except rider
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker && layer !== riderMarkerRef.current) {
        mapRef.current!.removeLayer(layer);
      }
      if (layer instanceof L.Polyline) {
        mapRef.current!.removeLayer(layer);
      }
    });

    const bounds: L.LatLng[] = [];

    // Add delivery marker
    if (deliveryLat && deliveryLng) {
      L.marker([deliveryLat, deliveryLng], { icon: createDeliveryIcon() })
        .bindPopup(`<b>Delivery:</b><br>${deliveryAddress}`)
        .addTo(mapRef.current);
      bounds.push(L.latLng(deliveryLat, deliveryLng));
    }

    // Add pickup marker
    if (pickupLat && pickupLng && pickupAddress) {
      L.marker([pickupLat, pickupLng], { icon: createPickupIcon() })
        .bindPopup(`<b>Pickup:</b><br>${pickupAddress}`)
        .addTo(mapRef.current);
      bounds.push(L.latLng(pickupLat, pickupLng));
    }

    // Update rider marker
    if (riderLocation?.current_location_lat && riderLocation?.current_location_lng) {
      const riderLatLng: L.LatLngExpression = [
        Number(riderLocation.current_location_lat),
        Number(riderLocation.current_location_lng),
      ];

      if (riderMarkerRef.current) {
        riderMarkerRef.current.setLatLng(riderLatLng);
      } else {
        riderMarkerRef.current = L.marker(riderLatLng, { icon: createRiderIcon() })
          .bindPopup(`<b>Your Rider:</b><br>${riderLocation.name || 'On the way'}`)
          .addTo(mapRef.current);
      }

      bounds.push(L.latLng(riderLatLng[0], riderLatLng[1]));

      // Draw route line from rider to delivery
      if (deliveryLat && deliveryLng) {
        L.polyline([riderLatLng, [deliveryLat, deliveryLng]], {
          color: '#3b82f6',
          weight: 3,
          opacity: 0.7,
          dashArray: '8, 8',
        }).addTo(mapRef.current);
      }
    }

    // Fit bounds
    if (bounds.length > 0) {
      mapRef.current.fitBounds(L.latLngBounds(bounds), {
        padding: [40, 40],
        maxZoom: 16,
      });
    }
  }, [riderLocation, deliveryLat, deliveryLng, deliveryAddress, pickupLat, pickupLng, pickupAddress]);

  const isRiderOnline = riderLocation?.is_online;
  const hasRiderLocation = riderLocation?.current_location_lat && riderLocation?.current_location_lng;

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="py-3 px-4 flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bike className="w-4 h-4 text-primary" />
          Live Tracking
        </CardTitle>
        <Badge variant={isRiderOnline ? 'default' : 'secondary'} className="text-xs">
          {isRiderOnline ? '● Live' : '○ Offline'}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapContainerRef} className="h-56 w-full" />

        {/* Dynamic ETA Display */}
        <div className="p-3 bg-primary/10 border-t border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {status === 'preparing' ? 'Pickup ETA' : 'Delivery ETA'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">{etaInfo.text}</span>
              {etaInfo.isLive && (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                  Live
                </Badge>
              )}
            </div>
          </div>
          {etaInfo.distance && (
            <p className="text-xs text-muted-foreground mt-1">
              Rider is {etaInfo.distance} km away
            </p>
          )}
        </div>

        {/* Legend */}
        <div className="p-3 bg-muted/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-lg">🏍️</span>
              <span className="text-muted-foreground">Rider</span>
            </div>
            {pickupAddress && (
              <div className="flex items-center gap-1">
                <span className="text-lg">🏪</span>
                <span className="text-muted-foreground">Pickup</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-lg">📍</span>
              <span className="text-muted-foreground">You</span>
            </div>
          </div>
          {hasRiderLocation && (
            <span className="text-primary font-medium">Tracking active</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveRiderTrackingMap;