import { useState } from 'react';
import { MapPin, Navigation, CheckCircle2, Loader2, Plus, Home, Building } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    useCustomerAddresses,
    useCreateAddress,
    CustomerAddress,
} from '@/hooks/useCustomerAddresses';

interface AddressSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedAddressId?: string;
    onSelect: (address: CustomerAddress) => void;
    /** Called when user wants to add a new address manually (opens SavedAddresses flow) */
    onAddNew?: () => void;
}

const labelIcon = (label: string) => {
    if (label === 'Home') return Home;
    if (label === 'Office') return Building;
    return MapPin;
};

export const AddressSelector = ({
    open,
    onOpenChange,
    selectedAddressId,
    onSelect,
    onAddNew,
}: AddressSelectorProps) => {
    const { data: addresses = [], isLoading } = useCustomerAddresses();
    const createAddress = useCreateAddress();
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude: lat, longitude: lng } = position.coords;

                // Reverse geocode using a free nominatim API (no key required)
                let addressText = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                        { headers: { 'Accept-Language': 'en' } }
                    );
                    if (response.ok) {
                        const data = await response.json();
                        if (data.display_name) {
                            addressText = data.display_name;
                        }
                    }
                } catch (err) {
                    console.warn('[AddressSelector] Reverse geocode failed, using coordinates', err);
                }

                try {
                    const newAddress = await createAddress.mutateAsync({
                        label: 'Current Location',
                        address_text: addressText,
                        lat,
                        lng,
                        is_default: addresses.length === 0,
                    });
                    toast.success('Current location saved as address');
                    onSelect(newAddress as CustomerAddress);
                    onOpenChange(false);
                } catch (err) {
                    console.error('[AddressSelector] Failed to save current location', err);
                    toast.error('Failed to save current location');
                } finally {
                    setIsGettingLocation(false);
                }
            },
            (error) => {
                setIsGettingLocation(false);
                if (error.code === error.PERMISSION_DENIED) {
                    toast.error('Location permission denied. Please allow location access.');
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    toast.error('Location unavailable. Please try again.');
                } else {
                    toast.error('Could not get your location. Please try again.');
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="font-black">Select Delivery Address</DialogTitle>
                    <DialogDescription>
                        Choose a saved address or use your current location
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {/* Use Current Location Button */}
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-3 h-auto py-3 border-primary/30 hover:border-primary hover:bg-primary/5"
                        onClick={handleUseCurrentLocation}
                        disabled={isGettingLocation || createAddress.isPending}
                    >
                        {isGettingLocation || createAddress.isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                        ) : (
                            <Navigation className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                        <div className="text-left">
                            <p className="font-bold text-sm text-primary">
                                {isGettingLocation ? 'Getting your location...' : 'Use Current Location'}
                            </p>
                            <p className="text-xs text-muted-foreground font-normal">
                                Detect & save your GPS location
                            </p>
                        </div>
                    </Button>

                    {/* Divider */}
                    {addresses.length > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground font-medium">Saved Addresses</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>
                    )}

                    {/* Saved Addresses */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : addresses.length === 0 ? (
                        <div className="text-center py-4">
                            <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground mb-3">No saved addresses yet</p>
                            {onAddNew && (
                                <Button variant="outline" size="sm" onClick={onAddNew} className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Add New Address
                                </Button>
                            )}
                        </div>
                    ) : (
                        addresses.map((addr) => {
                            const Icon = labelIcon(addr.label);
                            const isSelected = selectedAddressId === addr.id;
                            return (
                                <button
                                    key={addr.id}
                                    onClick={() => {
                                        onSelect(addr);
                                        onOpenChange(false);
                                    }}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${isSelected
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                                            <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-foreground'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm">{addr.label}</span>
                                                {addr.is_default && (
                                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                {addr.address_text}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}

                    {/* Add New Address link */}
                    {onAddNew && addresses.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full gap-2 text-primary hover:text-primary"
                            onClick={onAddNew}
                        >
                            <Plus className="h-4 w-4" />
                            Add New Address
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddressSelector;
