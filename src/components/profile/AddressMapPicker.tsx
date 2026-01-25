import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, MapPin, Loader2, Search, Check, LocateFixed, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface AddressMapPickerProps {
  onSelect: (location: { lat: number; lng: number; address: string }) => void;
  onBack: () => void;
  initialLocation?: { lat: number; lng: number };
}

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom GPS marker icon
const gpsIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="background: linear-gradient(135deg, #ff6a00 0%, #ff3d00 100%); width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(255,106,0,0.5); border: 3px solid white;"><div style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 14px;">📍</div></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

const AddressMapPicker = ({ onSelect, onBack, initialLocation }: AddressMapPickerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation || { lat: 30.1798, lng: 66.9750 } // Quetta default
  );
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Reverse geocode to get detailed address from coordinates
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`
      );
      const data = await response.json();
      
      if (data.display_name) {
        // Build detailed address from components
        const addr = data.address || {};
        const parts = [];
        
        if (addr.house_number) parts.push(addr.house_number);
        if (addr.road) parts.push(addr.road);
        if (addr.neighbourhood || addr.suburb) parts.push(addr.neighbourhood || addr.suburb);
        if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
        if (addr.state) parts.push(addr.state);
        if (addr.country) parts.push(addr.country);
        
        // Use constructed address or fallback to full display_name
        setAddress(parts.length > 2 ? parts.join(', ') : data.display_name);
      } else {
        setAddress(`Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setAddress(`Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

  // Get current GPS location with high accuracy
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setGpsAccuracy(null);

    const options: PositionOptions = {
      enableHighAccuracy: true, // Use GPS for best accuracy
      timeout: 15000, // 15 seconds timeout
      maximumAge: 0, // Don't use cached position
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        
        console.log(`[GPS] Location acquired: ${lat}, ${lng} (accuracy: ${accuracy}m)`);
        setGpsAccuracy(Math.round(accuracy));
        
        // Update state
        setSelectedLocation({ lat, lng });
        
        // Update map and marker
        if (mapInstance.current) {
          mapInstance.current.setView([lat, lng], 17); // Zoom in more for GPS
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          }
        }
        
        // Get address for the location
        await reverseGeocode(lat, lng);
        
        toast.success('📍 Location acquired!', {
          description: `Accuracy: ${Math.round(accuracy)}m`,
        });
        
        setIsLocating(false);
      },
      (error) => {
        console.error('[GPS] Error:', error);
        setIsLocating(false);
        
        let errorMessage = 'Unable to get your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable GPS access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }
        
        toast.error(errorMessage);
      },
      options
    );
  }, [reverseGeocode]);

  // Search for address
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        
        setSelectedLocation({ lat: newLat, lng: newLng });
        setAddress(display_name);
        
        if (mapInstance.current) {
          mapInstance.current.setView([newLat, newLng], 16);
          if (markerRef.current) {
            markerRef.current.setLatLng([newLat, newLng]);
          }
        }
      } else {
        toast.error('Address not found');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Initialize map
    mapInstance.current = L.map(mapRef.current, {
      zoomControl: false,
    }).setView([selectedLocation.lat, selectedLocation.lng], 15);

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    // Add draggable marker with custom icon
    markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
      draggable: true,
      icon: gpsIcon,
    }).addTo(mapInstance.current);

    // Handle marker drag
    markerRef.current.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      setSelectedLocation({ lat, lng });
      setGpsAccuracy(null); // Clear GPS accuracy when manually moved
      reverseGeocode(lat, lng);
    });

    // Handle map click
    mapInstance.current.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setSelectedLocation({ lat, lng });
      setGpsAccuracy(null); // Clear GPS accuracy when manually selected
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
      reverseGeocode(lat, lng);
    });

    // Initial reverse geocode
    reverseGeocode(selectedLocation.lat, selectedLocation.lng);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const handleConfirm = () => {
    onSelect({
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      address: address,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Pick Delivery Location</h1>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-card border-b border-border space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search for address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isSearching} variant="outline">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* GPS Button - Prominent */}
        <Button 
          onClick={getCurrentLocation} 
          disabled={isLocating}
          className="w-full gap-2 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
          size="lg"
        >
          {isLocating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Detecting Location...
            </>
          ) : (
            <>
              <LocateFixed className="h-5 w-5" />
              📍 Use My Current Location
            </>
          )}
        </Button>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="absolute inset-0" />
        
        {/* Instructions overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg z-[1000] border border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Navigation className="h-3 w-3" />
            Tap map or drag pin to adjust location
          </p>
        </div>

        {/* Floating GPS button on map */}
        <Button
          variant="glass"
          size="icon"
          onClick={getCurrentLocation}
          disabled={isLocating}
          className="absolute bottom-4 left-4 z-[1000] w-12 h-12 rounded-full shadow-lg"
        >
          {isLocating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LocateFixed className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Selected Address Footer */}
      <div className="bg-card border-t border-border p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
            <MapPin className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Delivery Location</p>
              {gpsAccuracy !== null && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400">
                  GPS ±{gpsAccuracy}m
                </span>
              )}
            </div>
            {isLoadingAddress ? (
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Fetching address...</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {address || 'Tap on map or use GPS to select location'}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              📍 {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </p>
          </div>
        </div>

        <Button 
          onClick={handleConfirm} 
          className="w-full gap-2"
          size="lg"
          disabled={!address}
        >
          <Check className="h-5 w-5" />
          Confirm Location
        </Button>
      </div>
    </div>
  );
};

export default AddressMapPicker;
