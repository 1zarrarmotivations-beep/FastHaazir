import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, 
  X, 
  Clock,
  MapPin,
  TrendingUp,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';

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

const RiderHeatmap = ({ isOpen, onClose, riderLat, riderLng }: RiderHeatmapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [heatmapData, setHeatmapData] = useState<HeatmapZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<HeatmapZone | null>(null);

  // Default to Quetta coordinates
  const defaultLat = riderLat || 30.1798;
  const defaultLng = riderLng || 66.9750;

  // Fetch heatmap data from existing orders
  useEffect(() => {
    if (!isOpen) return;

    const fetchHeatmapData = async () => {
      setIsLoading(true);

      // Calculate time range based on filter
      let startTime = new Date();
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
  }, [isOpen, timeFilter]);

  // Aggregate points into zones with a grid-based approach
  const aggregateToZones = (points: { lat: number; lng: number }[]): HeatmapZone[] => {
    if (points.length === 0) {
      // Return sample data for demo purposes
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
  };

  // Get sample data when no real data is available
  const getSampleHeatmapData = (): HeatmapZone[] => {
    // Sample zones around Quetta for demonstration
    return [
      { lat: 30.1850, lng: 66.9900, intensity: 0.9, orderCount: 15, areaName: 'Satellite Town' },
      { lat: 30.1750, lng: 66.9700, intensity: 0.7, orderCount: 10, areaName: 'Jinnah Road' },
      { lat: 30.1900, lng: 66.9600, intensity: 0.5, orderCount: 6, areaName: 'Samungli Road' },
      { lat: 30.1650, lng: 66.9850, intensity: 0.4, orderCount: 4, areaName: 'Zarghoon Road' },
      { lat: 30.1800, lng: 66.9550, intensity: 0.3, orderCount: 3, areaName: 'Brewery Road' },
    ];
  };

  // Simple area name approximation
  const getApproximateAreaName = (lat: number, lng: number): string => {
    // This would ideally use reverse geocoding, but for now return a generic name
    const areas = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F'];
    const index = Math.floor((lat * 100 + lng * 100) % areas.length);
    return areas[index];
  };

  // Initialize map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([defaultLat, defaultLng], 13);

    // Dark map style for better heatmap visibility
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(mapRef.current);

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen]);

  // Update heatmap circles
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing circles
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Circle || layer instanceof L.CircleMarker) {
        mapRef.current!.removeLayer(layer);
      }
    });

    // Add rider marker
    if (riderLat && riderLng) {
      L.circleMarker([riderLat, riderLng], {
        radius: 10,
        fillColor: '#00b894',
        color: '#00b894',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .bindPopup('<b>You are here</b>')
        .addTo(mapRef.current);
    }

    // Add heatmap zones
    heatmapData.forEach(zone => {
      const color = getHeatColor(zone.intensity);
      const radius = 200 + zone.intensity * 300; // 200-500m radius

      const circle = L.circle([zone.lat, zone.lng], {
        radius,
        fillColor: color,
        color: color,
        weight: 1,
        opacity: 0.6,
        fillOpacity: 0.4,
      }).addTo(mapRef.current!);

      circle.on('click', () => {
        setSelectedZone(zone);
      });
    });

    // Fit bounds to show all zones
    if (heatmapData.length > 0) {
      const bounds = L.latLngBounds(heatmapData.map(z => [z.lat, z.lng]));
      if (riderLat && riderLng) {
        bounds.extend([riderLat, riderLng]);
      }
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
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
    </AnimatePresence>
  );
};

export default RiderHeatmap;
