import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Search, LocateFixed, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";

interface BusinessLocationPickerProps {
  value: {
    lat: number | null;
    lng: number | null;
    address: string;
  };
  onChange: (location: { lat: number; lng: number; address: string }) => void;
  required?: boolean;
}

const mapContainerStyle = {
  width: "100%",
  height: "192px", // h-48
  borderRadius: "0.5rem",
};

const defaultCenter = {
  lat: 30.1798,
  lng: 66.9750, // Quetta
};

const options = {
  disableDefaultUI: true,
  zoomControl: true,
};

export function BusinessLocationPicker({ value, onChange, required = true }: BusinessLocationPickerProps) {
  const [center, setCenter] = useState(defaultCenter);
  const [markerPosition, setMarkerPosition] = useState(defaultCenter);

  const [localAddress, setLocalAddress] = useState(value.address || '');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Initialize state from props
  useEffect(() => {
    if (value.lat && value.lng) {
      const newPos = { lat: value.lat, lng: value.lng };
      setCenter(newPos);
      setMarkerPosition(newPos);
    }
  }, []); // Run once on mount if value exists (or depends on value if we want updates)

  // We should also sync if value changes externally, but be careful of cycles. 
  // For now, let's stick to internal state driving parent updates.

  // Search Autocomplete Hook
  const {
    ready,
    value: searchValue,
    setValue: setSearchValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: "pk" },
      location: new google.maps.LatLng(30.1798, 66.975),
      radius: 50000,
    },
    debounce: 300,
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Reverse Geocode
  const fetchAddress = useCallback(async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });

      if (response.results[0]) {
        const address = response.results[0].formatted_address;
        setLocalAddress(address);
        onChange({ lat, lng, address });
      } else {
        const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setLocalAddress(address);
        onChange({ lat, lng, address });
      }
    } catch (error) {
      console.error("Geocode Failed", error);
      toast.error("Failed to fetch address details");
      const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setLocalAddress(address);
      onChange({ lat, lng, address });
    } finally {
      setIsLoadingAddress(false);
    }
  }, [onChange]);

  // Handle Drag / Click
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });
      fetchAddress(lat, lng);
    }
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });
      fetchAddress(lat, lng);
    }
  };

  // Select Address from Suggestions
  const handleSelectSuggestion = async (description: string) => {
    setSearchValue(description, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);

      setCenter({ lat, lng });
      setMarkerPosition({ lat, lng });
      mapRef.current?.panTo({ lat, lng });

      setLocalAddress(description);
      onChange({ lat, lng, address: description });
    } catch (error) {
      console.error("Error: ", error);
      toast.error("Could not find location");
    }
  };

  // Get Current Location
  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.info("Getting location...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          setCenter({ lat, lng });
          setMarkerPosition({ lat, lng });
          fetchAddress(lat, lng);
          mapRef.current?.panTo({ lat, lng });
          toast.success("Location acquired!");
        },
        () => {
          toast.error("Could not get your location.");
        }
      );
    } else {
      toast.error("Geolocation is not supported");
    }
  };

  const isLocationSet = value.lat && value.lng && localAddress;

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        Business Location {required && <span className="text-destructive">*</span>}
      </Label>

      {/* Search Bar */}
      <div className="flex gap-2 relative">
        <div className="flex-1 relative">
          <Input
            placeholder="Search address in Quetta..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            disabled={!ready}
            className="w-full"
          />
          {status === "OK" && (
            <ul className="absolute top-full left-0 right-0 bg-popover border border-border shadow-lg rounded-md mt-1 z-50 max-h-60 overflow-y-auto">
              {data.map(({ place_id, description }) => (
                <li
                  key={place_id}
                  onClick={() => handleSelectSuggestion(description)}
                  className="px-4 py-3 hover:bg-muted cursor-pointer text-sm border-b last:border-b-0"
                >
                  {description}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button onClick={handleCurrentLocation} variant="outline" size="icon" type="button">
          <LocateFixed className="h-4 w-4" />
        </Button>
      </div>

      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border border-border">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={15}
          onLoad={onMapLoad}
          onClick={handleMapClick}
          options={options}
        >
          <MarkerF
            position={markerPosition}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
            animation={google.maps.Animation.DROP}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              scaledSize: new google.maps.Size(40, 40),
            }}
          />
        </GoogleMap>

        {/* Instruction overlay */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-muted-foreground z-10 pointer-events-none shadow-sm">
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
              📍 {Number(value.lat).toFixed(6)}, {Number(value.lng).toFixed(6)}
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
