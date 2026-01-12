import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';

interface DeliveryMapProps {
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  pickupAddress: string;
  dropoffAddress: string;
}

// Calculate distance between two points using Haversine formula
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Calculate delivery charge based on distance
// Uses default values if settings not provided
export const calculateDeliveryCharge = (
  distanceKm: number, 
  settings?: { base_fee?: number; per_km_rate?: number; min_payment?: number }
): number => {
  const baseCharge = settings?.base_fee ?? 80; // Default base charge in Rs
  const perKmRate = settings?.per_km_rate ?? 30; // Default Rs per km
  const minCharge = settings?.min_payment ?? 100; // Default minimum charge
  
  const calculated = baseCharge + (distanceKm * perKmRate);
  return Math.max(Math.round(calculated), minCharge);
};

const createPickupIcon = () => {
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
        <span style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 14px;">P</span>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

const createDropoffIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        background: linear-gradient(135deg, #ef4444, #dc2626);
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
        <span style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 14px;">D</span>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

const DeliveryMap = ({
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  pickupAddress,
  dropoffAddress,
}: DeliveryMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Default to Quetta if no coordinates
  const defaultLat = 30.1798;
  const defaultLng = 66.9750;

  const hasPickup = pickupLat !== null && pickupLng !== null;
  const hasDropoff = dropoffLat !== null && dropoffLng !== null;

  const distance = hasPickup && hasDropoff
    ? calculateDistance(pickupLat!, pickupLng!, dropoffLat!, dropoffLng!)
    : 0;

  const charge = calculateDeliveryCharge(distance);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([defaultLat, defaultLng], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers and lines
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        mapRef.current!.removeLayer(layer);
      }
    });

    const bounds: L.LatLngBoundsExpression = [];

    // Add pickup marker
    if (hasPickup) {
      L.marker([pickupLat!, pickupLng!], { icon: createPickupIcon() })
        .bindPopup(`<b>Pickup:</b><br>${pickupAddress}`)
        .addTo(mapRef.current);
      bounds.push([pickupLat!, pickupLng!]);
    }

    // Add dropoff marker
    if (hasDropoff) {
      L.marker([dropoffLat!, dropoffLng!], { icon: createDropoffIcon() })
        .bindPopup(`<b>Dropoff:</b><br>${dropoffAddress}`)
        .addTo(mapRef.current);
      bounds.push([dropoffLat!, dropoffLng!]);
    }

    // Draw line between pickup and dropoff
    if (hasPickup && hasDropoff) {
      L.polyline(
        [
          [pickupLat!, pickupLng!],
          [dropoffLat!, dropoffLng!],
        ],
        {
          color: '#8b5cf6',
          weight: 3,
          opacity: 0.8,
          dashArray: '10, 10',
        }
      ).addTo(mapRef.current);
    }

    // Fit bounds
    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds as L.LatLngBoundsExpression, {
        padding: [50, 50],
        maxZoom: 15,
      });
    }
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, hasPickup, hasDropoff, pickupAddress, dropoffAddress]);

  return (
    <Card className="bg-card border-border mb-4">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          Delivery Route
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapContainerRef} className="h-48 w-full" />
        <div className="p-3 bg-muted/30 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Pickup</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Dropoff</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-foreground font-medium">
            <MapPin className="w-4 h-4 text-primary" />
            {distance.toFixed(1)} km
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeliveryMap;
