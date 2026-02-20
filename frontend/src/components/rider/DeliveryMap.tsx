import React, { useRef, useState, useMemo } from 'react';
import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
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

const mapContainerStyle = {
  width: "100%",
  height: "192px", // h-48
  borderRadius: "0.5rem",
};

const defaultCenter = {
  lat: 30.1798,
  lng: 66.9750, // Quetta
};

const options = {
  disableDefaultUI: true,
  zoomControl: true,
};


const DeliveryMap = ({
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  pickupAddress,
  dropoffAddress,
}: DeliveryMapProps) => {
  const mapRef = useRef<google.maps.Map | null>(null);

  const hasPickup = pickupLat !== null && pickupLng !== null;
  const hasDropoff = dropoffLat !== null && dropoffLng !== null;

  const distance = hasPickup && hasDropoff
    ? calculateDistance(pickupLat!, pickupLng!, dropoffLat!, dropoffLng!)
    : 0;

  const onLoad = React.useCallback(function callback(map: google.maps.Map) {
    mapRef.current = map;
  }, []);

  const onUnmount = React.useCallback(function callback(map: google.maps.Map) {
    mapRef.current = null;
  }, []);

  // Fit Bounds
  React.useEffect(() => {
    if (mapRef.current && hasPickup && hasDropoff) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: pickupLat!, lng: pickupLng! });
      bounds.extend({ lat: dropoffLat!, lng: dropoffLng! });
      mapRef.current.fitBounds(bounds, 50);
    } else if (mapRef.current && hasPickup) {
      mapRef.current.panTo({ lat: pickupLat!, lng: pickupLng! });
    } else if (mapRef.current && hasDropoff) {
      mapRef.current.panTo({ lat: dropoffLat!, lng: dropoffLng! });
    }
  }, [hasPickup, hasDropoff, pickupLat, pickupLng, dropoffLat, dropoffLng]);

  const pathCoordinates = useMemo(() => {
    if (hasPickup && hasDropoff) {
      return [
        { lat: pickupLat!, lng: pickupLng! },
        { lat: dropoffLat!, lng: dropoffLng! },
      ];
    }
    return [];
  }, [hasPickup, hasDropoff, pickupLat, pickupLng, dropoffLat, dropoffLng]);

  return (
    <Card className="bg-card border-border mb-4">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          Delivery Route
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-48 w-full relative">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={13}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={options}
          >
            {/* Pickup Marker */}
            {hasPickup && (
              <MarkerF
                position={{ lat: pickupLat!, lng: pickupLng! }}
                label={{ text: "P", color: "white", className: "font-bold" }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#22c55e",
                  fillOpacity: 1,
                  strokeColor: "white",
                  strokeWeight: 2,
                }}
              />
            )}

            {/* Dropoff Marker */}
            {hasDropoff && (
              <MarkerF
                position={{ lat: dropoffLat!, lng: dropoffLng! }}
                label={{ text: "D", color: "white", className: "font-bold" }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#ef4444",
                  fillOpacity: 1,
                  strokeColor: "white",
                  strokeWeight: 2,
                }}
              />
            )}

            {/* Route Line */}
            {pathCoordinates.length > 0 && (
              <PolylineF
                path={pathCoordinates}
                options={{
                  strokeColor: '#8b5cf6',
                  strokeOpacity: 0.8,
                  strokeWeight: 3,
                  geodesic: true,
                  icons: [{
                    icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                    offset: '0',
                    repeat: '20px'
                  }]
                }}
              />
            )}

          </GoogleMap>
        </div>

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
