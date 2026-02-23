import React, { useEffect, useState, useRef, useCallback } from 'react';
import { GoogleMap, MarkerF, DirectionsRenderer } from '@react-google-maps/api';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NavigationTopCard from './NavigationTopCard';

interface RiderDashboardMapProps {
    riderLocation: { lat: number; lng: number } | null;
    activeDelivery: any | null;
    currentRiderId?: string;
    zoom?: number;
    mapType?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
    onZoomChange?: (zoom: number) => void;
}

const mapContainerStyle = {
    width: "100%",
    height: "100%",
};

const defaultCenter = {
    lat: 30.1798,
    lng: 66.9750, // Quetta
};

const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    styles: [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    ]
};

const DEVIATION_THRESHOLD_METERS = 100;

const RiderDashboardMap = ({
    riderLocation,
    activeDelivery,
    currentRiderId,
    zoom = 15,
    mapType = 'roadmap',
    onZoomChange
}: RiderDashboardMapProps) => {
    const mapRef = useRef<google.maps.Map | null>(null);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [eta, setEta] = useState<string>('');
    const [distance, setDistance] = useState<string>('');
    const [lastRerouteLocation, setLastRerouteLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Fetch nearby riders (for idle mode visualization)
    const { data: nearbyRiders } = useQuery({
        queryKey: ['nearby-riders-dashboard', currentRiderId],
        queryFn: async () => {
            const { data } = await supabase
                .from('riders')
                .select('id, current_location_lat, current_location_lng')
                .eq('is_online', true)
                .neq('id', currentRiderId || '');
            return data || [];
        },
        refetchInterval: 10000,
        enabled: !activeDelivery
    });

    const calculateRoute = useCallback((origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => {
        if (!window.google) return;

        const directionsService = new google.maps.DirectionsService();
        directionsService.route({
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
        }, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
                setDirections(result);
                setLastRerouteLocation(origin);
                const leg = result.routes[0].legs[0];
                setEta(leg.duration?.text || '');
                setDistance(leg.distance?.text || '');
            }
        });
    }, []);

    // Effect: Handle Routing Transitions
    useEffect(() => {
        if (!window.google) return; // Added this line
        if (!activeDelivery || !riderLocation) {
            setDirections(null);
            setEta('');
            setDistance('');
            return;
        }

        const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status } = activeDelivery;
        const isHeadingToDrop = ['picked_up', 'delivering', 'on_way'].includes(status);

        const targetLat = isHeadingToDrop ? dropoff_lat : pickup_lat;
        const targetLng = isHeadingToDrop ? dropoff_lng : pickup_lng;

        if (!targetLat || !targetLng) return;

        const target = { lat: Number(targetLat), lng: Number(targetLng) };

        // 1. Initial Route Calculation
        if (!directions || !lastRerouteLocation) {
            calculateRoute(riderLocation, target);
        } else {
            // 2. Deviation Check
            const distFromLastReroute = google.maps.geometry.spherical.computeDistanceBetween(
                new google.maps.LatLng(riderLocation.lat, riderLocation.lng),
                new google.maps.LatLng(lastRerouteLocation.lat, lastRerouteLocation.lng)
            );

            // If rider moved more than threshold, or destination changed, recalculate
            if (distFromLastReroute > DEVIATION_THRESHOLD_METERS) {
                calculateRoute(riderLocation, target);
            }
        }
    }, [activeDelivery, riderLocation, calculateRoute, directions, lastRerouteLocation]);

    // Effect: Navigation Auto-pan - keeps rider centered in nav mode
    useEffect(() => {
        if (mapRef.current && riderLocation && activeDelivery) {
            // In active navigation, we want to see both rider and target occasionally, 
            // but primarily stay focused on the rider's path
            const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status } = activeDelivery;
            const isHeadingToDrop = ['picked_up', 'delivering', 'on_way'].includes(status);
            const targetLat = isHeadingToDrop ? dropoff_lat : pickup_lat;
            const targetLng = isHeadingToDrop ? dropoff_lng : pickup_lng;

            if (targetLat && targetLng) {
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(riderLocation);
                bounds.extend({ lat: Number(targetLat), lng: Number(targetLng) });

                // Initial fit or if status changed
                mapRef.current.fitBounds(bounds, { top: 100, bottom: 250, left: 50, right: 50 });
            } else {
                mapRef.current.panTo(riderLocation);
            }
        }
    }, [activeDelivery?.status, riderLocation === null]); // Only refit on status change or losing/gaining signal

    // Continuous centering (gentle)
    useEffect(() => {
        if (mapRef.current && riderLocation && activeDelivery) {
            mapRef.current.panTo(riderLocation);
        }
    }, [riderLocation, activeDelivery]);

    // Effect: Idle Mode Bounds fitting
    useEffect(() => {
        if (mapRef.current && riderLocation && !activeDelivery) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(riderLocation);
            if (nearbyRiders?.length) {
                nearbyRiders.slice(0, 5).forEach(r => {
                    if (r.current_location_lat) bounds.extend({ lat: Number(r.current_location_lat), lng: Number(r.current_location_lng) });
                });
            }
            mapRef.current.fitBounds(bounds, 150);
        }
    }, [riderLocation === null, activeDelivery === null]);

    const onLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        // Set initial orientation
        map.setTilt(45);
    }, []);

    const onUnmount = useCallback(() => {
        mapRef.current = null;
    }, []);

    const status: 'to_pickup' | 'to_drop' = activeDelivery
        ? (['picked_up', 'delivering', 'on_way'].includes(activeDelivery.status) ? 'to_drop' : 'to_pickup')
        : 'to_pickup';

    // Verify google object is available from Provider
    if (!window.google) {
        return (
            <div className="h-full w-full bg-[#0f172a] flex items-center justify-center p-8 text-center">
                <div className="space-y-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                    <p className="text-white/40 text-xs font-black uppercase tracking-widest">Initialising HUD Systems...</p>
                </div>
            </div>
        );
    }

    return (
        <Card className="h-full w-full overflow-hidden border-none shadow-2xl relative bg-[#0f172a]">
            {/* Ambient Background Glow for Map Container */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b]/50 to-[#0f172a] pointer-events-none" />

            <CardContent className="p-0 relative h-full bg-transparent">
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={riderLocation || defaultCenter}
                    zoom={zoom}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    onZoomChanged={() => {
                        if (mapRef.current && onZoomChange) {
                            onZoomChange(mapRef.current.getZoom() || zoom);
                        }
                    }}
                    options={{
                        ...mapOptions,
                        mapTypeId: mapType,
                        tilt: 45,
                        gestureHandling: 'greedy',
                        clickableIcons: false,
                        maxZoom: 20,
                        minZoom: 3
                    }}
                >
                    {/* Rider Marker (Animated 3D-style Bike) */}
                    {riderLocation && (
                        <MarkerF
                            position={riderLocation}
                            icon={{
                                url: 'https://cdn-icons-png.flaticon.com/128/9425/9425836.png', // Premium Bike Icon
                                scaledSize: new google.maps.Size(48, 48),
                                anchor: new google.maps.Point(24, 24)
                            }}
                            zIndex={100}
                        />
                    )}

                    {/* Destination Marker */}
                    {activeDelivery && (
                        <MarkerF
                            position={{
                                lat: Number(status === 'to_pickup' ? activeDelivery.pickup_lat : activeDelivery.dropoff_lat),
                                lng: Number(status === 'to_pickup' ? activeDelivery.pickup_lng : activeDelivery.dropoff_lng)
                            }}
                            icon={{
                                url: status === 'to_pickup'
                                    ? 'https://cdn-icons-png.flaticon.com/128/3177/3177440.png' // Shop
                                    : 'https://cdn-icons-png.flaticon.com/128/149/149059.png', // House
                                scaledSize: new google.maps.Size(40, 40),
                                anchor: new google.maps.Point(20, 20)
                            }}
                        />
                    )}

                    {/* Nearby Riders Markers (Idle Mode) */}
                    {!activeDelivery && nearbyRiders?.map(r => (
                        r.current_location_lat && (
                            <MarkerF
                                key={r.id}
                                position={{ lat: Number(r.current_location_lat), lng: Number(r.current_location_lng) }}
                                opacity={0.5}
                                icon={{
                                    url: 'https://cdn-icons-png.flaticon.com/128/3448/3448636.png',
                                    scaledSize: new google.maps.Size(24, 24),
                                }}
                            />
                        )
                    ))}

                    {/* Polyline Route */}
                    {directions && (
                        <DirectionsRenderer
                            options={{
                                directions: directions,
                                suppressMarkers: true,
                                polylineOptions: {
                                    strokeColor: status === 'to_pickup' ? "#f97316" : "#10b981", // Orange to Emerald
                                    strokeOpacity: 0.8,
                                    strokeWeight: 6,
                                }
                            }}
                        />
                    )}
                </GoogleMap>

                {/* Overlays / HUD */}
                <AnimatePresence>
                    {!activeDelivery && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-4 left-4 z-10"
                        >
                            <div className="bg-black/60 backdrop-blur-xl text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 flex items-center gap-2 shadow-2xl">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                Monitoring Zones
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
};

export default RiderDashboardMap;
