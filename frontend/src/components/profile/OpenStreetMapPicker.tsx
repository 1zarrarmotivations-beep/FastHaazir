import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, MapPin, Loader2, Navigation, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

// Leaflet CSS is imported in main.tsx or index.html
// Using dynamic import to avoid SSR issues
import type { LatLngExpression } from "leaflet";

interface AddressMapPickerProps {
    onSelect: (location: { lat: number; lng: number; address: string }) => void;
    onBack: () => void;
    initialLocation?: { lat: number; lng: number };
}

// Default location (Quetta, Pakistan)
const DEFAULT_CENTER: LatLngExpression = [30.1798, 66.975];

const OpenStreetMapPicker: React.FC<AddressMapPickerProps> = ({ onSelect, onBack, initialLocation }) => {
    const [mapLoaded, setMapLoaded] = useState(false);
    const [Leaflet, setLeaflet] = useState<any>(null);
    const [map, setMap] = useState<any>(null);
    const [marker, setMarker] = useState<any>(null);
    const [center, setCenter] = useState<LatLngExpression>(initialLocation ? [initialLocation.lat, initialLocation.lng] : DEFAULT_CENTER);
    const [address, setAddress] = useState("");
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    // Load Leaflet dynamically
    useEffect(() => {
        const loadLeaflet = async () => {
            try {
                const L = (await import("leaflet")).default;

                // Fix for default marker icons in Leaflet with webpack/vite
                delete (L.Icon.Default.prototype as any)._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
                    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
                    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
                });

                setLeaflet(L);
                setMapLoaded(true);
            } catch (error) {
                console.error("Failed to load Leaflet:", error);
                toast.error("Failed to load map");
            }
        };
        loadLeaflet();
    }, []);

    // Initialize map
    useEffect(() => {
        if (!mapLoaded || !Leaflet || map) return;

        const mapInstance = Leaflet.map("map-container", {
            center: center,
            zoom: 15,
            zoomControl: false,
        });

        // Add OpenStreetMap tiles
        Leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(mapInstance);

        // Add click handler
        mapInstance.on("click", (e: any) => {
            const { lat, lng } = e.latlng;
            updateMarkerPosition(lat, lng);
        });

        setMap(mapInstance);

        // Initial marker at center
        const markerInstance = Leaflet.marker(center, { draggable: true }).addTo(mapInstance);

        // Handle marker drag
        markerInstance.on("dragend", (e: any) => {
            const { lat, lng } = e.target.getLatLng();
            fetchAddress(lat, lng);
        });

        setMarker(markerInstance);

        // Initial address fetch
        const lat = (center as [number, number])[0];
        const lng = (center as [number, number])[1];
        fetchAddress(lat, lng);

        return () => {
            if (mapInstance) {
                mapInstance.remove();
            }
        };
    }, [mapLoaded, Leaflet]);

    const updateMarkerPosition = useCallback((lat: number, lng: number) => {
        if (!Leaflet || !map || !marker) return;

        const newPos: LatLngExpression = [lat, lng];
        marker.setLatLng(newPos);
        map.setView(newPos, 15);
        fetchAddress(lat, lng);
    }, [Leaflet, map, marker]);

    // Reverse Geocode Function using Nominatim
    const fetchAddress = useCallback(async (lat: number, lng: number) => {
        setIsLoadingAddress(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'en',
                        'User-Agent': 'FastHaazir/1.0'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.display_name) {
                    setAddress(data.display_name);
                } else {
                    setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                }
            } else {
                setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
        } catch (error) {
            console.error("Reverse geocode failed:", error);
            setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        } finally {
            setIsLoadingAddress(false);
        }
    }, []);

    // Search location using Nominatim
    const handleSearch = async () => {
        if (!searchQuery.trim() || !Leaflet || !map) return;

        setIsLoadingAddress(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=pk`,
                {
                    headers: {
                        'Accept-Language': 'en',
                        'User-Agent': 'FastHaazir/1.0'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    const result = data[0];
                    const lat = parseFloat(result.lat);
                    const lng = parseFloat(result.lon);

                    const newPos: LatLngExpression = [lat, lng];
                    map.setView(newPos, 16);

                    if (marker) {
                        marker.setLatLng(newPos);
                    }

                    setAddress(result.display_name);
                    setCenter(newPos);
                } else {
                    toast.error("Location not found");
                }
            }
        } catch (error) {
            console.error("Search failed:", error);
            toast.error("Search failed");
        } finally {
            setIsLoadingAddress(false);
        }
    };

    // Get current location
    const handleCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported");
            return;
        }

        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude: lat, longitude: lng } = position.coords;

                if (map && marker && Leaflet) {
                    const newPos: LatLngExpression = [lat, lng];
                    map.setView(newPos, 16);
                    marker.setLatLng(newPos);
                    fetchAddress(lat, lng);
                }
                setIsGettingLocation(false);
            },
            (error) => {
                setIsGettingLocation(false);
                if (error.code === error.PERMISSION_DENIED) {
                    toast.error("Location permission denied");
                } else {
                    toast.error("Could not get location");
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleConfirm = () => {
        if (!marker || !address) return;

        const pos = marker.getLatLng();
        onSelect({
            lat: pos.lat,
            lng: pos.lng,
            address,
        });
    };

    if (!mapLoaded) {
        return (
            <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading map...</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Header */}
            <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm z-10">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-bold">Pick Location</h1>
            </div>

            {/* Search Bar */}
            <div className="p-3 bg-card border-b border-border z-10">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search location in Pakistan..."
                            className="pr-10"
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    <Button onClick={handleSearch} size="sm">
                        Search
                    </Button>
                </div>
            </div>

            {/* Map Container */}
            <div id="map-container" className="flex-1 w-full" style={{ minHeight: "400px" }} />

            {/* Current Location Button */}
            <div className="absolute top-24 right-4 z-[1000]">
                <Button
                    size="icon"
                    variant="secondary"
                    className="rounded-full shadow-lg bg-white"
                    onClick={handleCurrentLocation}
                    disabled={isGettingLocation}
                >
                    {isGettingLocation ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Navigation className="h-5 w-5" />
                    )}
                </Button>
            </div>

            {/* Footer Address Confirmation */}
            <div className="bg-card border-t border-border p-4 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
                <Card className="bg-muted/30 border-none">
                    <CardContent className="p-3 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">Selected Location</p>
                            {isLoadingAddress ? (
                                <div className="flex items-center gap-2 text-primary mt-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span className="text-sm font-medium">Fetching address...</span>
                                </div>
                            ) : (
                                <p className="text-sm font-semibold text-foreground line-clamp-2 mt-0.5">
                                    {address || "Tap on map to select location"}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Button
                    onClick={handleConfirm}
                    className="w-full h-12 text-base font-semibold"
                    disabled={!address || isLoadingAddress}
                >
                    <Check className="h-5 w-5 mr-2" />
                    Confirm Location
                </Button>
            </div>
        </div>
    );
};

export default OpenStreetMapPicker;
