import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, Loader2, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  // Reverse geocode to get detailed address from coordinates
  const reverseGeocode = async (lat: number, lng: number) => {
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
  };

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
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Initialize map
    mapInstance.current = L.map(mapRef.current).setView(
      [selectedLocation.lat, selectedLocation.lng],
      15
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance.current);

    // Add draggable marker
    markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
      draggable: true,
    }).addTo(mapInstance.current);

    // Handle marker drag
    markerRef.current.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      setSelectedLocation({ lat, lng });
      reverseGeocode(lat, lng);
    });

    // Handle map click
    mapInstance.current.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setSelectedLocation({ lat, lng });
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
        <h1 className="text-lg font-bold">Pick Location</h1>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-card border-b border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Search for address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="absolute inset-0" />
        
        {/* Center indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card px-4 py-2 rounded-full shadow-lg z-[1000]">
          <p className="text-xs text-muted-foreground">Tap or drag marker to set location</p>
        </div>
      </div>

      {/* Selected Address */}
      <div className="bg-card border-t border-border p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Selected Location</p>
            {isLoadingAddress ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading address...</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {address || 'Tap on map to select location'}
              </p>
            )}
          </div>
        </div>

        <Button 
          onClick={handleConfirm} 
          className="w-full gap-2"
          disabled={!address}
        >
          <Check className="h-4 w-4" />
          Confirm Location
        </Button>
      </div>
    </div>
  );
};

export default AddressMapPicker;
