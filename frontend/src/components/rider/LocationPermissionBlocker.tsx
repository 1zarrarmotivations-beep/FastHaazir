import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LocationPermissionStatus } from '@/hooks/useRiderLocation';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';

interface LocationPermissionBlockerProps {
    permissionStatus: LocationPermissionStatus;
    isLocationEnabled: boolean;
    onRequestPermission: () => void;
    onCheckAgain: () => void;
}

const LocationPermissionBlocker = ({
    permissionStatus,
    isLocationEnabled,
    onRequestPermission,
    onCheckAgain
}: LocationPermissionBlockerProps) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Only show if there is a problem
        const hasProblem = permissionStatus !== 'granted' || !isLocationEnabled;
        setIsVisible(hasProblem);
    }, [permissionStatus, isLocationEnabled]);

    const openSettings = async () => {
        try {
            await NativeSettings.open({
                optionAndroid: AndroidSettings.ApplicationDetails,
                optionIOS: IOSSettings.App
            });
        } catch (e) {
            console.error('Failed to open settings:', e);
        }
    };

    const openLocationSettings = async () => {
        try {
            await NativeSettings.open({
                optionAndroid: AndroidSettings.Location,
                optionIOS: IOSSettings.LocationServices
            });
        } catch (e) {
            console.error('Failed to open location settings:', e);
            openSettings(); // Fallback
        }
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
            >
                <div className="max-w-md w-full space-y-8">
                    <motion.div
                        animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-24 h-24 mx-auto bg-red-500/20 rounded-full flex items-center justify-center border-4 border-red-500/50"
                    >
                        <MapPin className="w-12 h-12 text-red-500" />
                    </motion.div>

                    <div className="space-y-4">
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            Location Required
                        </h1>
                        <p className="text-lg text-white/70 leading-relaxed">
                            To go online and receive orders, we need precise location access.
                        </p>

                        <div className="bg-white/5 rounded-xl p-4 text-left space-y-3 border border-white/10">
                            <div className="flex items-center gap-3 text-white/80">
                                {permissionStatus === 'granted' ? (
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <CheckIcon className="w-4 h-4 text-emerald-500" />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                        <XIcon className="w-4 h-4 text-red-500" />
                                    </div>
                                )}
                                <span>Location Permission</span>
                            </div>

                            <div className="flex items-center gap-3 text-white/80">
                                {isLocationEnabled ? (
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <CheckIcon className="w-4 h-4 text-emerald-500" />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                        <XIcon className="w-4 h-4 text-red-500" />
                                    </div>
                                )}
                                <span>GPS / Location Service</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-4">
                        {permissionStatus !== 'granted' && (
                            <Button
                                onClick={onRequestPermission}
                                className="w-full h-14 text-lg font-bold bg-white text-black hover:bg-white/90 rounded-2xl"
                            >
                                Allow Permission
                            </Button>
                        )}

                        {!isLocationEnabled && (
                            <Button
                                onClick={openLocationSettings}
                                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-2xl"
                            >
                                <Settings className="w-5 h-5 mr-2" />
                                Enable GPS
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            onClick={onCheckAgain}
                            className="w-full h-14 text-lg font-semibold bg-transparent border-white/20 text-white hover:bg-white/10 rounded-2xl"
                        >
                            Check Again
                        </Button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

function CheckIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function XIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M18 6 6 18" />
            <path d="M6 6 18 18" />
        </svg>
    );
}

export default LocationPermissionBlocker;
