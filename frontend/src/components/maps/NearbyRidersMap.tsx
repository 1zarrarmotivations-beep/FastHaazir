import React, { useState, useRef, useEffect, useCallback } from "react";
import { GoogleMap, MarkerF, InfoWindowF } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Bike, Navigation, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const mapContainerStyle = {
    width: "100%",
    height: "350px",
    borderRadius: "1rem",
};

const defaultCenter = {
    lat: 30.1798,
    lng: 66.9750, // Quetta
};

const options = {
    disableDefaultUI: true, // Cleaner look for customers
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    styles: [ // Optional: Custom map style (e.g., Night mode or minimal)
        {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
        }
    ]
};

export const NearbyRidersMap = () => {
    const mapRef = useRef<google.maps.Map | null>(null);
    const [selectedRider, setSelectedRider] = useState<any | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Get User Location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => console.log("Error getting location", error)
            );
        }
    }, []);

    // Fetch ONLY Online Riders
    const { data: onlineRiders } = useQuery({
        queryKey: ["nearby-riders"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("riders")
                .select("id, name, current_location_lat, current_location_lng, vehicle_type")
                .eq("is_online", true)
                .not("current_location_lat", "is", null)
                .not("current_location_lng", "is", null);

            if (error) throw error;
            return data;
        },
        refetchInterval: 10000, // Refresh every 10s
    });

    const onLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const onUnmount = useCallback(() => {
        mapRef.current = null;
    }, []);

    // Fit bounds only on initial load or if user clicks "find nearby"
    useEffect(() => {
        if (mapRef.current && onlineRiders && onlineRiders.length > 0 && !selectedRider) {
            // Optional: Don't always re-center to avoid annoying user while panning
        }
    }, [onlineRiders]);

    return (
        <Card className="overflow-hidden border-none shadow-xl bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3 px-4 pt-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        Live Nearby Riders
                    </CardTitle>
                    <Badge variant="outline" className="text-xs font-normal">
                        {onlineRiders?.length || 0} active
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0 relative">
                <div className="h-[350px] w-full relative">
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={userLocation || defaultCenter}
                        zoom={14}
                        onLoad={onLoad}
                        onUnmount={onUnmount}
                        options={{
                            ...options,
                            styles: [
                                { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                                { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                                { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                                {
                                    featureType: "road",
                                    elementType: "geometry",
                                    stylers: [{ color: "#38414e" }]
                                },
                            ]
                        }}
                    >
                        {/* User Marker */}
                        {userLocation && (
                            <MarkerF
                                position={userLocation}
                                icon={{
                                    url: 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', // Premium 3D Home Pin
                                    scaledSize: new google.maps.Size(45, 45),
                                    anchor: new google.maps.Point(22, 45)
                                }}
                                zIndex={100}
                            />
                        )}

                        {/* Rider Markers */}
                        {onlineRiders?.map((rider) => (
                            <MarkerF
                                key={rider.id}
                                position={{
                                    lat: Number(rider.current_location_lat),
                                    lng: Number(rider.current_location_lng),
                                }}
                                icon={{
                                    url: 'https://cdn-icons-png.flaticon.com/512/9425/9425836.png', // Premium 3D Bike
                                    scaledSize: new google.maps.Size(48, 48),
                                    anchor: new google.maps.Point(24, 24)
                                }}
                                zIndex={50}
                                onClick={() => setSelectedRider(rider)}
                            />
                        ))}

                        {selectedRider && (
                            <InfoWindowF
                                position={{
                                    lat: Number(selectedRider.current_location_lat),
                                    lng: Number(selectedRider.current_location_lng),
                                }}
                                onCloseClick={() => setSelectedRider(null)}
                            >
                                <div className="p-2 min-w-[120px] bg-white rounded-lg">
                                    <p className="font-bold text-gray-900 border-b pb-1 mb-1">{selectedRider.name}</p>
                                    <Badge variant="outline" className="text-[10px] text-primary bg-primary/5 border-primary/20">
                                        {selectedRider.vehicle_type || 'Swift Delivery'}
                                    </Badge>
                                </div>
                            </InfoWindowF>
                        )}
                    </GoogleMap>

                    {/* Recenter Button */}
                    <button
                        onClick={() => {
                            if (mapRef.current && userLocation) {
                                mapRef.current.panTo(userLocation);
                                mapRef.current.setZoom(15);
                            }
                        }}
                        className="absolute top-4 right-4 bg-white/90 backdrop-blur-md p-2 rounded-full shadow-lg border border-white/20 hover:bg-white transition-all text-primary"
                    >
                        <Navigation className="w-5 h-5" />
                    </button>

                    {/* Floating Overlay for Impact */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 shadow-inner">
                                <Bike className="w-6 h-6 text-primary animate-bounce-slow" />
                            </div>
                            <div>
                                <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">FastHaazir Live Fleet</p>
                                <p className="text-sm font-bold text-white flex items-center gap-2">
                                    {onlineRiders?.length ? (
                                        <>
                                            <span className="text-emerald-400">{onlineRiders.length} Riders</span> active near you
                                        </>
                                    ) : (
                                        <span className="text-white/70">Connecting with fleet...</span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </div>
                    </motion.div>
                </div>
            </CardContent>
        </Card>
    );
};
