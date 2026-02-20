import React, { useState, useRef, useEffect, useCallback } from "react";
import { GoogleMap, MarkerF, InfoWindowF } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminRiders } from "@/hooks/useAdmin";
import { Bike, MapPin, RefreshCw, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

const mapContainerStyle = {
  width: "100%",
  height: "500px",
  borderRadius: "0.5rem",
};

const defaultCenter = {
  lat: 30.1798,
  lng: 66.9750, // Quetta
};

const options = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
};

export function LiveRidersMap() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedRider, setSelectedRider] = useState<any | null>(null);

  const { data: riders, isLoading, refetch } = useAdminRiders();

  useEffect(() => {
    if (riders) {
      setLastUpdate(new Date());
    }
  }, [riders]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Fit bounds to show all riders
  useEffect(() => {
    if (mapRef.current && riders && riders.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      let hasValidLoc = false;

      riders.forEach(rider => {
        if (rider.current_location_lat && rider.current_location_lng) {
          bounds.extend({
            lat: Number(rider.current_location_lat),
            lng: Number(rider.current_location_lng)
          });
          hasValidLoc = true;
        }
      });

      if (hasValidLoc) {
        mapRef.current.fitBounds(bounds, 50);
      }
    }
  }, [riders]);

  const onlineRiders = riders?.filter(r => r.is_online) || [];
  const offlineRiders = riders?.filter(r => !r.is_online) || [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
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
      <Card className="overflow-hidden border-border bg-card">
        <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-border/50 bg-muted/20 px-4 py-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5 text-primary" />
              Live Rider Locations
            </CardTitle>
            <CardDescription>
              Real-time view of all registered riders
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 relative">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={12}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={options}
          >
            {riders?.map((rider) => (
              rider.current_location_lat && rider.current_location_lng && (
                <MarkerF
                  key={rider.id}
                  position={{
                    lat: Number(rider.current_location_lat),
                    lng: Number(rider.current_location_lng),
                  }}
                  icon={{
                    // Use a custom icon URL or allow default google marker with color
                    // For now using a colored dot or bike icon
                    url: rider.is_online
                      ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                      : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                    scaledSize: new google.maps.Size(40, 40),
                  }}
                  onClick={() => setSelectedRider(rider)}
                />
              )
            ))}

            {selectedRider && (
              <InfoWindowF
                position={{
                  lat: Number(selectedRider.current_location_lat),
                  lng: Number(selectedRider.current_location_lng),
                }}
                onCloseClick={() => setSelectedRider(null)}
              >
                <div className="p-2 min-w-[150px]">
                  <h3 className="font-bold text-sm mb-1">{selectedRider.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Bike className="w-3 h-3" />
                    {selectedRider.vehicle_type || 'Unknown Vehicle'}
                  </div>
                  <Badge variant={selectedRider.is_online ? 'default' : 'secondary'} className="w-full justify-center">
                    {selectedRider.is_online ? 'Online' : 'Offline'}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-2 border-t pt-1">
                    Lat: {Number(selectedRider.current_location_lat).toFixed(4)}<br />
                    Lng: {Number(selectedRider.current_location_lng).toFixed(4)}
                  </p>
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>
        </CardContent>
      </Card>

      {/* Online Riders List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Online Riders List</CardTitle>
        </CardHeader>
        <CardContent>
          {onlineRiders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bike className="w-6 h-6 opacity-50" />
              </div>
              <p>No riders are currently online</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {onlineRiders.map((rider) => (
                <div
                  key={rider.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors cursor-pointer"
                  onClick={() => {
                    if (rider.current_location_lat && rider.current_location_lng && mapRef.current) {
                      mapRef.current.panTo({
                        lat: Number(rider.current_location_lat),
                        lng: Number(rider.current_location_lng)
                      });
                      mapRef.current.setZoom(15);
                      setSelectedRider(rider);
                    }
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <Bike className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{rider.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{rider.vehicle_type}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 text-[10px]">
                      Online
                    </Badge>
                    {rider.current_location_lat && (
                      <Navigation className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
