import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminRiders } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Bike, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Custom rider icon
const createRiderIcon = (isOnline: boolean) => {
  return L.divIcon({
    className: 'custom-rider-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${isOnline ? 'linear-gradient(135deg, #00b894, #00a884)' : '#9ca3af'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 3px solid white;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18.5" cy="17.5" r="3.5"/>
          <circle cx="5.5" cy="17.5" r="3.5"/>
          <circle cx="15" cy="5" r="1"/>
          <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

export function LiveRidersMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { data: riders, isLoading, refetch } = useAdminRiders();

  // Update timestamp when data changes (handled by useAdminRiders invalidation)
  useEffect(() => {
    if (riders) {
      setLastUpdate(new Date());
    }
  }, [riders]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      center: [30.1798, 66.9750], // Quetta coordinates
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    L.control.zoom({ position: "topright" }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when riders change
  useEffect(() => {
    if (!mapRef.current || !riders) return;

    const currentRiderIds = new Set(riders.map(r => r.id));

    // Remove markers for riders no longer in the list
    markersRef.current.forEach((marker, riderId) => {
      if (!currentRiderIds.has(riderId)) {
        marker.remove();
        markersRef.current.delete(riderId);
      }
    });

    // Add/update markers for current riders
    riders.forEach((rider) => {
      if (rider.current_location_lat && rider.current_location_lng) {
        const lat = Number(rider.current_location_lat);
        const lng = Number(rider.current_location_lng);

        if (markersRef.current.has(rider.id)) {
          // Update existing marker
          const marker = markersRef.current.get(rider.id)!;
          marker.setLatLng([lat, lng]);
          marker.setIcon(createRiderIcon(rider.is_online || false));
        } else {
          // Create new marker
          const marker = L.marker([lat, lng], {
            icon: createRiderIcon(rider.is_online || false),
          }).addTo(mapRef.current!);

          marker.bindPopup(`
            <div style="text-align: center; min-width: 120px;">
              <strong>${rider.name}</strong><br/>
              <span style="color: #666;">${rider.vehicle_type}</span><br/>
              <span style="color: ${rider.is_online ? '#00b894' : '#9ca3af'};">
                ${rider.is_online ? '🟢 Online' : '⚫ Offline'}
              </span>
            </div>
          `);

          markersRef.current.set(rider.id, marker);
        }
      }
    });
  }, [riders]);

  const onlineRiders = riders?.filter(r => r.is_online) || [];
  const offlineRiders = riders?.filter(r => !r.is_online) || [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{onlineRiders.length}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{offlineRiders.length}</p>
              <p className="text-xs text-muted-foreground">Offline</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bike className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{riders?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Riders</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {riders?.filter(r => r.current_location_lat).length || 0}
              </p>
              <p className="text-xs text-muted-foreground">With Location</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5 text-primary" />
            Live Rider Locations
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div
            ref={mapContainerRef}
            className="w-full h-[500px]"
            style={{ minHeight: "500px" }}
          />
        </CardContent>
      </Card>

      {/* Online Riders List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Online Riders</CardTitle>
        </CardHeader>
        <CardContent>
          {onlineRiders.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No riders online</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {onlineRiders.map((rider) => (
                <div
                  key={rider.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Bike className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{rider.name}</p>
                    <p className="text-xs text-muted-foreground">{rider.vehicle_type}</p>
                  </div>
                  <Badge className="bg-accent/20 text-accent">
                    Online
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
