import React, { useEffect, useState, useRef, useCallback } from 'react';
import { GoogleMap, MarkerF, DirectionsRenderer, CircleF } from '@react-google-maps/api';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Bike, Navigation, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface RiderDashboardMapProps {
    riderLocation: { lat: number; lng: number } | null;
    activeDelivery: any | null; // Pass the full active delivery object
    currentRiderId?: string;
}

const mapContainerStyle = {
    width: "100%",
    height: "300px",
    borderRadius: "1rem",
};

const defaultCenter = {
    lat: 30.1798,
    lng: 66.9750, // Quetta
};

const options = {
    disableDefaultUI: true,
    zoomControl: true,
    // Dark mode style
    styles: [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }],
        },
        {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#212a37" }],
        },
        {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }],
        },
    ]
};

const RiderDashboardMap = ({ riderLocation, activeDelivery, currentRiderId }: RiderDashboardMapProps) => {
    const mapRef = useRef<google.maps.Map | null>(null);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [otherRiders, setOtherRiders] = useState<any[]>([]);

    // Fetch nearby riders (excluding self)
    const { data: nearbyData } = useQuery({
        queryKey: ['nearby-riders-dashboard', currentRiderId],
        queryFn: async () => {
            let query = supabase
                .from('riders')
                .select('id, current_location_lat, current_location_lng, is_online')
                .eq('is_online', true);

            if (currentRiderId) {
                query = query.neq('id', currentRiderId);
            }

            const { data } = await query;
            return data || [];
        },
        refetchInterval: 10000,
        // Always fetch to show team presence
    });

    useEffect(() => {
        if (nearbyData) setOtherRiders(nearbyData);
    }, [nearbyData]);


    // Routing Logic
    useEffect(() => {
        if (!activeDelivery || !riderLocation || !window.google) {
            setDirections(null);
            return;
        }

        const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status } = activeDelivery;
        const origin = riderLocation;
        let destination = null;

        // Logic:
        // If status is 'accepted' or 'heading_to_pickup', route is Rider -> Pickup
        // If status is 'picked_up' or 'delivering', route is Rider -> Dropoff
        // Maybe show full path Rider -> Pickup -> Dropoff?

        if (!pickup_lat || !pickup_lng) return;

        if (activeDelivery.status === 'picked_up' || activeDelivery.status === 'delivering' || activeDelivery.status === 'on_way') {
            if (dropoff_lat && dropoff_lng) {
                destination = { lat: dropoff_lat, lng: dropoff_lng };
            }
        } else {
            // Heading to pickup or waiting
            destination = { lat: pickup_lat, lng: pickup_lng };
        }

        if (!destination) return;

        const directionsService = new google.maps.DirectionsService();
        directionsService.route({
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING
        }, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                setDirections(result);
            }
        });

    }, [activeDelivery, riderLocation]);

    const onLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    // Fit bounds
    useEffect(() => {
        if (mapRef.current && riderLocation) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(riderLocation);

            if (activeDelivery) {
                if (activeDelivery.pickup_lat) bounds.extend({ lat: activeDelivery.pickup_lat, lng: activeDelivery.pickup_lng });
                if (activeDelivery.dropoff_lat) bounds.extend({ lat: activeDelivery.dropoff_lat, lng: activeDelivery.dropoff_lng });
            }

            // If idle, extend to include nearby riders for context
            if (!activeDelivery && otherRiders.length > 0) {
                otherRiders.slice(0, 3).forEach(r => {
                    if (r.current_location_lat) bounds.extend({ lat: r.current_location_lat, lng: r.current_location_lng });
                });
            }

            mapRef.current.fitBounds(bounds, activeDelivery ? 50 : 100);

            // If just rider (idle) and no nearby fit, zoom in
            if (!activeDelivery && otherRiders.length === 0) {
                mapRef.current.setZoom(15);
                mapRef.current.panTo(riderLocation);
            }
        }
    }, [riderLocation, activeDelivery, otherRiders]);


    return (
        <Card className="overflow-hidden border-border/50 bg-surface/50 backdrop-blur-md shadow-lg mb-4">
            <CardContent className="p-0 relative h-[300px]">
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={riderLocation || defaultCenter}
                    zoom={14}
                    onLoad={onLoad}
                    options={options}
                >
                    {/* Self Marker (Premium 3D Bike) */}
                    {riderLocation && (
                        <MarkerF
                            position={riderLocation}
                            icon={{
                                url: 'https://cdn-icons-png.flaticon.com/512/9425/9425836.png', // Premium 3D Bike
                                scaledSize: new google.maps.Size(50, 50),
                                anchor: new google.maps.Point(25, 25)
                            }}
                            zIndex={1000}
                        />
                    )}

                    {/* Other Riders (Simple Bike - slightly smaller/faded) */}
                    {otherRiders.map(rider => (
                        rider.current_location_lat && (
                            <MarkerF
                                key={rider.id}
                                position={{ lat: rider.current_location_lat, lng: rider.current_location_lng }}
                                icon={{
                                    url: 'https://cdn-icons-png.flaticon.com/512/3448/3448636.png', // Simple Flat Bike
                                    scaledSize: new google.maps.Size(32, 32),
                                    anchor: new google.maps.Point(16, 16)
                                }}
                                opacity={0.8}
                                onClick={() => {
                                    // Maybe show info window later?
                                }}
                            />
                        )
                    ))}

                    {/* Directions */}
                    {directions && (
                        <DirectionsRenderer
                            options={{
                                directions: directions,
                                suppressMarkers: true, // Use custom markers
                                polylineOptions: {
                                    strokeColor: "#10b981", // Emerald-500
                                    strokeOpacity: 0.8,
                                    strokeWeight: 6,
                                }
                            }}
                        />
                    )}

                    {/* Pickup/Dropoff Markers */}
                    {activeDelivery && (
                        <>
                            {activeDelivery.pickup_lat && (
                                <MarkerF
                                    position={{ lat: activeDelivery.pickup_lat, lng: activeDelivery.pickup_lng }}
                                    label={{ text: "🏪", className: "text-2xl" }}
                                    title="Pickup"
                                />
                            )}
                            {activeDelivery.dropoff_lat && (
                                <MarkerF
                                    position={{ lat: activeDelivery.dropoff_lat, lng: activeDelivery.dropoff_lng }}
                                    label={{ text: "📍", className: "text-2xl" }}
                                    title="Dropoff"
                                />
                            )}
                        </>
                    )}
                </GoogleMap>

                {/* Status Overlay */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                    <div className="bg-black/80 backdrop-blur-md text-white px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border border-white/10 shadow-lg">
                        <div className={`w-2 h-2 rounded-full ${activeDelivery ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'} `} />
                        {activeDelivery ? (
                            <span>Live Route: <span className="text-emerald-300 font-bold">{activeDelivery.status === 'on_way' || activeDelivery.status === 'picked_up' ? 'Dropoff' : 'Pickup'}</span></span>
                        ) : (
                            <span>Searching for Orders</span>
                        )}
                    </div>

                    {activeDelivery && (
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-black/5 flex items-center gap-3 min-w-[200px]"
                        >
                            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                <Navigation className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Next Stop</p>
                                <p className="text-sm font-bold text-gray-900 truncate">
                                    {activeDelivery.status === 'on_way' || activeDelivery.status === 'picked_up'
                                        ? activeDelivery.dropoff_address
                                        : activeDelivery.pickup_address}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Contextual Stats (Idle only) */}
                {!activeDelivery && otherRiders.length > 0 && (
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute bottom-4 right-4 z-10 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 flex items-center gap-2 shadow-2xl"
                    >
                        <div className="flex -space-x-2 mr-1">
                            {[1, 2, 3].slice(0, Math.min(otherRiders.length, 3)).map(i => (
                                <div key={i} className="w-6 h-6 rounded-full border-2 border-white/30 bg-primary/20" />
                            ))}
                        </div>
                        <span>{otherRiders.length} Riders Active</span>
                    </motion.div>
                )}
            </CardContent>
        </Card>
    );
};

export default RiderDashboardMap;
