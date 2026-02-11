import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Bell, Camera, Mic, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionType, usePermissions } from '@/hooks/usePermissions';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';

interface PermissionStep {
    type: PermissionType;
    title: string;
    description: string;
    icon: any;
    required: boolean;
}

const PERMISSION_CONFIG: Record<PermissionType, PermissionStep> = {
    location: {
        type: 'location',
        title: 'Location Access',
        description: 'We need your location to assign nearby orders and track deliveries in real-time.',
        icon: MapPin,
        required: true
    },
    notifications: {
        type: 'notifications',
        title: 'Enable Notifications',
        description: 'Get instant alerts for new orders, updates, and urgent messages.',
        icon: Bell,
        required: true
    },
    camera: {
        type: 'camera',
        title: 'Camera Access',
        description: 'Required to scan documents, take proof of delivery photos, and verify identity.',
        icon: Camera,
        required: true
    },
    microphone: {
        type: 'microphone',
        title: 'Microphone Check',
        description: 'Needed for voice features and ensuring your device audio is working for alerts.',
        icon: Mic,
        required: true
    }
};

interface PermissionWizardProps {
    requiredPermissions: PermissionType[];
    onComplete: () => void;
    isOpen: boolean;
    userRole?: 'rider' | 'customer' | 'admin';
}

const PermissionWizard = ({ requiredPermissions, onComplete, isOpen }: PermissionWizardProps) => {
    const { permissions, requestPermission, checkPermissions } = usePermissions();
    const [isRequesting, setIsRequesting] = useState(false);
    const [showSettingsHelper, setShowSettingsHelper] = useState(false);

    // Filter out permissions that are already granted
    // Note: We deliberately check against 'granted'
    const pendingPermissions = requiredPermissions.filter(p => permissions[p] !== 'granted');

    // Identify the current permission we need to ask for
    const currentPermissionType = pendingPermissions.length > 0 ? pendingPermissions[0] : null;

    // Complete if all clear
    useEffect(() => {
        // Only auto-complete if permissions state is not 'unknown'
        // checkPermissions sets state to 'unknown' initially, then actual status
        const isReady = Object.values(permissions).every(p => p !== 'unknown');

        if (isReady && pendingPermissions.length === 0 && isOpen) {
            const timer = setTimeout(onComplete, 500);
            return () => clearTimeout(timer);
        }
    }, [pendingPermissions.length, isOpen, onComplete, permissions]);

    const currentConfig = currentPermissionType ? PERMISSION_CONFIG[currentPermissionType] : null;

    const handleAllow = async () => {
        if (!currentPermissionType) return;

        setIsRequesting(true);
        try {
            const result = await requestPermission(currentPermissionType);

            if (result !== 'granted') {
                // If denied, show settings helper
                if (result === 'denied') {
                    setShowSettingsHelper(true);
                }
            } else {
                setShowSettingsHelper(false);
            }
        } catch (e) {
            console.error('Permission request failed', e);
        } finally {
            setIsRequesting(false);
            checkPermissions();
        }
    };

    const openSettings = async () => {
        try {
            await NativeSettings.open({
                optionAndroid: AndroidSettings.ApplicationDetails,
                optionIOS: IOSSettings.App
            });
        } catch (e) {
            console.error('Failed to open settings', e);
        }
    };

    if (!isOpen || !currentConfig) return null;

    // Calculate progress
    const total = requiredPermissions.length;
    const completed = total - pendingPermissions.length;
    const progress = total > 0 ? (completed / total) * 100 : 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6"
            >
                <div className="w-full max-w-md">
                    {/* Progress Bar */}
                    <div className="mb-8">
                        <div className="flex justify-between text-xs text-white/50 mb-2 uppercase tracking-wider font-semibold">
                            <span>Setup Progress</span>
                            <span>{completed}/{total} Completed</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentConfig.type}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center relative overflow-hidden"
                        >
                            {/* Background Glow */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/20 blur-[60px] rounded-full pointer-events-none" />

                            {/* Icon */}
                            <div className="relative mb-6 mx-auto w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-full flex items-center justify-center border border-white/10 shadow-lg shadow-emerald-500/10">
                                <currentConfig.icon className="w-10 h-10 text-emerald-400" />
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-3">
                                {currentConfig.title}
                            </h2>

                            <p className="text-white/60 text-lg leading-relaxed mb-8">
                                {currentConfig.description}
                            </p>

                            {!showSettingsHelper ? (
                                <div className="space-y-3">
                                    <Button
                                        onClick={handleAllow}
                                        disabled={isRequesting}
                                        className="w-full h-14 rounded-2xl text-lg font-bold bg-white text-black hover:bg-white/90 shadow-lg shadow-white/10 active:scale-95 transition-all"
                                    >
                                        {isRequesting ? 'Requesting...' : 'Review Permission'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-left animate-in fade-in slide-in-from-bottom-2">
                                    <h3 className="font-semibold text-red-400 mb-1 flex items-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        Permission Denied
                                    </h3>
                                    <p className="text-sm text-white/70 mb-4">
                                        This permission is required for the app to function. Please enable it in system settings.
                                    </p>
                                    <Button
                                        onClick={openSettings}
                                        className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50"
                                    >
                                        Open Settings
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setShowSettingsHelper(false);
                                            checkPermissions();
                                        }}
                                        className="w-full mt-2 text-white/40 hover:text-white"
                                    >
                                        I've enabled it
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    <div className="mt-8 text-center">
                        <p className="text-white/30 text-xs flex items-center justify-center gap-2">
                            <Shield className="w-3 h-3" />
                            Secure & Privacy Focused
                        </p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PermissionWizard;
