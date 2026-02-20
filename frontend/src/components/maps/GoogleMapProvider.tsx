import React from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

export const GoogleMapProvider = ({ children }: { children: React.ReactNode }) => {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    if (loadError) {
        return (
            <div className="flex items-center justify-center p-4 bg-red-50 text-red-600 rounded-lg">
                <p>Error loading Google Maps. Please check your internet connection.</p>
            </div>
        );
    }

    if (!isLoaded) {
        // Return children but manage loading state inside components or return a global loader
        // For now, we render null until script loads to prevent "google not defined" errors
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return <>{children}</>;
};
