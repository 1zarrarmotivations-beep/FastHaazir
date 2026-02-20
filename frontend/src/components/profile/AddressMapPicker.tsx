import React, { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, MapPin, Loader2, Search, Check, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useJsApiLoader } from "@react-google-maps/api";

interface AddressMapPickerProps {
  onSelect: (location: { lat: number; lng: number; address: string }) => void;
  onBack: () => void;
  initialLocation?: { lat: number; lng: number };
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 30.1798,
  lng: 66.975, // Quetta
};

const options = {
  disableDefaultUI: true,
  zoomControl: false,
};

const GoogleMapPicker: React.FC<AddressMapPickerProps> = ({ onSelect, onBack, initialLocation }) => {
  // Ensure Google Maps is loaded
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places", "geometry"],
  });

  const [center, setCenter] = useState(initialLocation || defaultCenter);
  const [markerPosition, setMarkerPosition] = useState(initialLocation || defaultCenter);
  const [address, setAddress] = useState("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);

  // Search Autocomplete Hook
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: "pk" }, // Limit to Pakistan
      location: new google.maps.LatLng(30.1798, 66.975), // Bias to Quetta
      radius: 50000,
    },
    debounce: 300,
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Reverse Geocode Function
  const fetchAddress = useCallback(async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });

      if (response.results[0]) {
        setAddress(response.results[0].formatted_address);
      } else {
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (error) {
      console.error("Geocode Failed", error);
      toast.error("Failed to fetch address details");
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

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
    setValue(description, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);

      setCenter({ lat, lng });
      setMarkerPosition({ lat, lng });
      setAddress(description);
      mapRef.current?.panTo({ lat, lng });
    } catch (error) {
      console.error("Error: ", error);
      toast.error("Could not find location");
    }
  };

  // Get Current Location
  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          setCenter({ lat, lng });
          setMarkerPosition({ lat, lng });
          fetchAddress(lat, lng);
          mapRef.current?.panTo({ lat, lng });
        },
        () => {
          toast.error("Could not get your location.");
        }
      );
    }
  };

  // Init Address Fetch
  useEffect(() => {
    if (initialLocation) {
      fetchAddress(initialLocation.lat, initialLocation.lng);
    } else {
      // Default fetch for center
      fetchAddress(defaultCenter.lat, defaultCenter.lng);
    }
  }, []);

  const handleConfirm = () => {
    onSelect({
      lat: markerPosition.lat,
      lng: markerPosition.lng,
      address,
    });
  };

  if (!isLoaded) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 flex items-center gap-3 shadow-sm z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Pick Location</h1>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-card z-10 relative">
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={!ready}
            placeholder="Search places..."
            className="pl-10"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

          {/* Autocomplete Suggestions */}
          {status === "OK" && (
            <ul className="absolute top-full left-0 right-0 bg-popover border border-border shadow-lg rounded-md mt-1 z-20 max-h-60 overflow-y-auto">
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
      </div>

      {/* Map */}
      <div className="flex-1 relative h-full w-full">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={15}
          options={options}
          onLoad={onMapLoad}
          onClick={handleMapClick}
        >
          <MarkerF
            position={markerPosition}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
            animation={google.maps.Animation.DROP}
          />
        </GoogleMap>

        {/* Floating Controls */}
        <div className="absolute bottom-6 right-4 flex flex-col gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full shadow-lg"
            onClick={handleCurrentLocation}
          >
            <Navigation className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Footer Address Confirmation */}
      <div className="bg-card border-t border-border p-4 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
        <div className="flex items-start gap-3">
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
                {address || 'Tap on map to select location'}
              </p>
            )}
          </div>
        </div>

        <Button
          onClick={handleConfirm}
          className="w-full h-12 text-base font-semibold shadow-brand"
          disabled={!address || isLoadingAddress}
        >
          <Check className="h-5 w-5 mr-2" />
          Confirm Location
        </Button>
      </div>
    </div>
  );
};

export default GoogleMapPicker;
