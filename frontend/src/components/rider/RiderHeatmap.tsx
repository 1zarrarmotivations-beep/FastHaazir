import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  X,
  Clock,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { GoogleMap, CircleF, MarkerF } from '@react-google-maps/api';

interface HeatmapZone {
  lat: number;
  lng: number;
  intensity: number; // 0-1
  orderCount: number;
  areaName: string;
}

interface RiderHeatmapProps {
  isOpen: boolean;
  onClose: () => void;
  riderLat?: number;
  riderLng?: number;
}

type TimeFilter = '1h' | 'today' | 'peak';

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 30.1798,
  lng: 66.9750, // Quetta
};

// Dark mode map style
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
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
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

const options = {
  disableDefaultUI: true,
  zoomControl: false,
  styles: darkMapStyle,
};

const RiderHeatmap = ({ isOpen, onClose, riderLat, riderLng }: RiderHeatmapProps) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [heatmapData, setHeatmapData] = useState<HeatmapZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<HeatmapZone | null>(null);

  // Default to Quetta coordinates
  const center = useMemo(() => {
    return riderLat && riderLng ? { lat: riderLat, lng: riderLng } : defaultCenter;
  }, [riderLat, riderLng]);

  // Aggregate points into zones with a grid-based approach
  const aggregateToZones = useCallback((points: { lat: number; lng: number }[]): HeatmapZone[] => {
    // Simple area name approximation
    const getApproximateAreaName = (lat: number, lng: number): string => {
      // This would ideally use reverse geocoding, but for now return a generic name
      const areas = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F'];
      const index = Math.floor((Math.abs(lat) * 100 + Math.abs(lng) * 100) % areas.length);
      return areas[index];
    };

    // Get sample data when no real data is available
    const getSampleHeatmapData = (): HeatmapZone[] => {
      return [
        { lat: 30.1850, lng: 66.9900, intensity: 0.9, orderCount: 15, areaName: 'Satellite Town' },
        { lat: 30.1750, lng: 66.9700, intensity: 0.7, orderCount: 10, areaName: 'Jinnah Road' },
        { lat: 30.1900, lng: 66.9600, intensity: 0.5, orderCount: 6, areaName: 'Samungli Road' },
        { lat: 30.1650, lng: 66.9850, intensity: 0.4, orderCount: 4, areaName: 'Zarghoon Road' },
        { lat: 30.1800, lng: 66.9550, intensity: 0.3, orderCount: 3, areaName: 'Brewery Road' },
      ];
    };

    if (points.length === 0) {
      return getSampleHeatmapData();
    }

    const gridSize = 0.01; // Approximately 1km grid cells
    const grid: Record<string, { lat: number; lng: number; count: number }> = {};

    points.forEach(point => {
      const gridLat = Math.floor(point.lat / gridSize) * gridSize;
      const gridLng = Math.floor(point.lng / gridSize) * gridSize;
      const key = `${gridLat},${gridLng}`;

      if (!grid[key]) {
        grid[key] = { lat: gridLat + gridSize / 2, lng: gridLng + gridSize / 2, count: 0 };
      }
      grid[key].count++;
    });

    const maxCount = Math.max(...Object.values(grid).map(g => g.count), 1);

    return Object.values(grid).map(zone => ({
      lat: zone.lat,
      lng: zone.lng,
      intensity: zone.count / maxCount,
      orderCount: zone.count,
      areaName: getApproximateAreaName(zone.lat, zone.lng),
    }));
  }, []);

  // Fetch heatmap data from existing orders
  useEffect(() => {
    if (!isOpen) return;

    const fetchHeatmapData = async () => {
      setIsLoading(true);

      // Calculate time range based on filter
      const startTime = new Date();
      if (timeFilter === '1h') {
        startTime.setHours(startTime.getHours() - 1);
      } else if (timeFilter === 'today') {
        startTime.setHours(0, 0, 0, 0);
      } else if (timeFilter === 'peak') {
        // Peak hours: 12-2 PM and 7-10 PM
        const hour = new Date().getHours();
        if (hour >= 12 && hour < 14) {
          startTime.setHours(12, 0, 0, 0);
        } else if (hour >= 19 && hour < 22) {
          startTime.setHours(19, 0, 0, 0);
        } else {
          // Show last peak period
          startTime.setHours(startTime.getHours() - 4);
        }
      }

      try {
        // Fetch orders with coordinates
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('pickup_lat, pickup_lng, delivery_lat, delivery_lng, created_at')
          .gte('created_at', startTime.toISOString())
          .not('pickup_lat', 'is', null)
          .not('pickup_lng', 'is', null);

        // Fetch rider requests with coordinates
        const { data: requests, error: requestsError } = await supabase
          .from('rider_requests')
          .select('pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, created_at')
          .gte('created_at', startTime.toISOString())
          .not('pickup_lat', 'is', null)
          .not('pickup_lng', 'is', null);

        if (ordersError) console.error('Orders error:', ordersError);
        if (requestsError) console.error('Requests error:', requestsError);

        // Aggregate locations into grid zones
        const zones = aggregateToZones([
          ...(orders || []).map(o => ({ lat: o.pickup_lat!, lng: o.pickup_lng! })),
          ...(orders || []).map(o => o.delivery_lat && o.delivery_lng ? { lat: o.delivery_lat, lng: o.delivery_lng } : null).filter(Boolean) as { lat: number; lng: number }[],
          ...(requests || []).map(r => ({ lat: r.pickup_lat!, lng: r.pickup_lng! })),
          ...(requests || []).map(r => r.dropoff_lat && r.dropoff_lng ? { lat: r.dropoff_lat, lng: r.dropoff_lng } : null).filter(Boolean) as { lat: number; lng: number }[],
        ]);

        setHeatmapData(zones);
      } catch (error) {
        console.error('Error fetching heatmap data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHeatmapData();
  }, [isOpen, timeFilter, aggregateToZones]);


  const onLoad = useCallback(function callback(map: google.maps.Map) {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    mapRef.current = null;
  }, []);

  // Fit Bounds
  useEffect(() => {
    if (mapRef.current && heatmapData.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      heatmapData.forEach(zone => {
        bounds.extend({ lat: zone.lat, lng: zone.lng });
      });
      if (riderLat && riderLng) {
        bounds.extend({ lat: riderLat, lng: riderLng });
      }
      mapRef.current.fitBounds(bounds, 50);
    }
  }, [heatmapData, riderLat, riderLng]);


  const getHeatColor = (intensity: number): string => {
    if (intensity >= 0.8) return '#ff3d00'; // Hot - Red
    if (intensity >= 0.6) return '#ff6a00'; // Warm - Orange
    if (intensity >= 0.4) return '#ffa726'; // Medium - Light Orange
    if (intensity >= 0.2) return '#ffcc02'; // Cool - Yellow
    return '#ffeb3b'; // Low - Light Yellow
  };

  const timeFilters: { id: TimeFilter; label: string; icon: React.ReactNode }[] = [
    { id: '1h', label: 'Last Hour', icon: <Clock className="w-4 h-4" /> },
    { id: 'today', label: 'Today', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'peak', label: 'Peak Hours', icon: <Flame className="w-4 h-4" /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-background via-background/95 to-transparent p-4 pb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Demand Heatmap</h2>
                  <p className="text-xs text-muted-foreground">Find high-order zones</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Time Filters */}
            <div className="flex gap-2">
              {timeFilters.map(filter => (
                <Button
                  key={filter.id}
                  variant={timeFilter === filter.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter(filter.id)}
                  className="flex-1"
                >
                  {filter.icon}
                  <span className="ml-2 text-xs">{filter.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Map */}
          <div className="w-full h-full relative">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={13}
              onLoad={onLoad}
              onUnmount={onUnmount}
              options={options}
            >
              {/* Rider Marker */}
              {riderLat && riderLng && (
                <MarkerF
                  position={{ lat: riderLat, lng: riderLng }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: "#00b894",
                    fillOpacity: 1,
                    strokeColor: "white",
                    strokeWeight: 2,
                  }}
                />
              )}

              {/* Heatmap Zones (Circles) */}
              {heatmapData.map((zone, index) => {
                const color = getHeatColor(zone.intensity);
                const radius = 200 + zone.intensity * 300; // 200-500m radius

                return (
                  <CircleF
                    key={`${zone.lat}-${zone.lng}-${index}`}
                    center={{ lat: zone.lat, lng: zone.lng }}
                    radius={radius}
                    options={{
                      fillColor: color,
                      fillOpacity: 0.4,
                      strokeColor: color,
                      strokeOpacity: 0.6,
                      strokeWeight: 1,
                    }}
                    onClick={() => setSelectedZone(zone)}
                  />
                )
              })}

            </GoogleMap>
          </div>

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center pointer-events-none">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-24 left-4 bg-card/95 backdrop-blur-sm rounded-2xl p-3 shadow-card">
            <p className="text-xs font-semibold text-foreground mb-2">Order Density</p>
            <div className="flex items-center gap-1">
              <div className="w-6 h-3 rounded bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500" />
              <span className="text-xs text-muted-foreground ml-2">Low → High</span>
            </div>
          </div>

          {/* Selected Zone Info */}
          <AnimatePresence>
            {selectedZone && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="absolute bottom-4 left-4 right-4 bg-card rounded-2xl p-4 shadow-elevated"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${getHeatColor(selectedZone.intensity)}20` }}
                    >
                      <MapPin
                        className="w-6 h-6"
                        style={{ color: getHeatColor(selectedZone.intensity) }}
                      />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{selectedZone.areaName}</p>
                      <p className="text-sm text-muted-foreground">
                        ~{selectedZone.orderCount} orders nearby
                      </p>
                    </div>
                  </div>
                  <Badge
                    className="px-3 py-1"
                    style={{
                      backgroundColor: `${getHeatColor(selectedZone.intensity)}20`,
                      color: getHeatColor(selectedZone.intensity),
                    }}
                  >
                    {selectedZone.intensity >= 0.7 ? 'Hot Zone 🔥' :
                      selectedZone.intensity >= 0.4 ? 'Moderate' : 'Low Activity'}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setSelectedZone(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RiderHeatmap;
