import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Search, LocateFixed, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface BusinessLocationPickerProps {
  value: {
    lat: number | null;
    lng: number | null;
    address: string;
  };
  onChange: (location: { lat: number; lng: number; address: string }) => void;
  required?: boolean;
}

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Business location marker
const businessIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="background: linear-gradient(135deg, #00b894 0%, #10b981 100%); width: 40px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,184,148,0.5); border: 3px solid white;"><div style="transform: rotate(45deg); font-size: 16px;">🏪</div></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

export function BusinessLocationPicker({ value, onChange, required = true }: BusinessLocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [localAddress, setLocalAddress] = useState(value.address || '');
  const [localLat, setLocalLat] = useState(value.lat || 30.1798);
  const [localLng, setLocalLng] = useState(value.lng || 66.9750);

  // Reverse geocode to get address from coordinates
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`
      );
      const data = await response.json();
      
      if (data.display_name) {
        const addr = data.address || {};
        const parts = [];
        
        if (addr.house_number) parts.push(addr.house_number);
        if (addr.road) parts.push(addr.road);
        if (addr.neighbourhood || addr.suburb) parts.push(addr.neighbourhood || addr.suburb);
        if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
        
        const address = parts.length > 2 ? parts.join(', ') : data.display_name;
        setLocalAddress(address);
        onChange({ lat, lng, address });
      } else {
        const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setLocalAddress(address);
        onChange({ lat, lng, address });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setLocalAddress(address);
      onChange({ lat, lng, address });
    } finally {
      setIsLoadingAddress(false);
    }
  }, [onChange]);

  // Get current GPS location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        
        setLocalLat(lat);
        setLocalLng(lng);
        
        if (mapInstance.current) {
          mapInstance.current.setView([lat, lng], 17);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          }
        }
        
        await reverseGeocode(lat, lng);
        toast.success('Location acquired!');
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        toast.error('Unable to get location');
        console.error('GPS Error:', error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [reverseGeocode]);

  // Search for address
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ' Quetta')}&limit=1`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        
        setLocalLat(newLat);
        setLocalLng(newLng);
        setLocalAddress(display_name);
        onChange({ lat: newLat, lng: newLng, address: display_name });
        
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
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initialLat = value.lat || 30.1798;
    const initialLng = value.lng || 66.9750;

    mapInstance.current = L.map(mapRef.current, {
      zoomControl: false,
    }).setView([initialLat, initialLng], value.lat ? 16 : 13);

    L.control.zoom({ position: 'topright' }).addTo(mapInstance.current);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    // Add draggable marker
    markerRef.current = L.marker([initialLat, initialLng], {
      draggable: true,
      icon: businessIcon,
    }).addTo(mapInstance.current);

    markerRef.current.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      setLocalLat(lat);
      setLocalLng(lng);
      reverseGeocode(lat, lng);
    });

    mapInstance.current.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setLocalLat(lat);
      setLocalLng(lng);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
      reverseGeocode(lat, lng);
    });

    // Initial geocode if we have coordinates
    if (value.lat && value.lng && !value.address) {
      reverseGeocode(value.lat, value.lng);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const isLocationSet = localLat && localLng && localAddress;

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        Business Location {required && <span className="text-destructive">*</span>}
      </Label>

      {/* Search Bar */}
      <div className="flex gap-2">
        <Input
          placeholder="Search address in Quetta..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={isSearching} variant="outline" size="icon">
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
        <Button onClick={getCurrentLocation} disabled={isLocating} variant="outline" size="icon">
          {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
        </Button>
      </div>

      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border border-border">
        <div ref={mapRef} className="w-full h-48" />
        
        {/* Instruction overlay */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-muted-foreground z-[1000]">
          Click map or drag pin to set location
        </div>
      </div>

      {/* Location Display */}
      <div className={`p-3 rounded-lg border ${isLocationSet ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
        {isLoadingAddress ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Getting address...</span>
          </div>
        ) : isLocationSet ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground line-clamp-2">{localAddress}</p>
            <p className="text-xs text-muted-foreground">
              📍 {localLat.toFixed(6)}, {localLng.toFixed(6)}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Location is required for pickup</span>
          </div>
        )}
      </div>
    </div>
  );
}
