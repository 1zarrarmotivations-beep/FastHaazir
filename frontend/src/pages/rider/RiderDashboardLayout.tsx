import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Hooks
import {
    useRiderProfile,
    usePendingRequests,
    useMyActiveDeliveries,
    useAcceptRequest,
    useUpdateDeliveryStatus,
    useToggleOnlineStatus,
    RiderRequest,
} from '@/hooks/useRiderDashboard';
import { useRiderLocation } from '@/hooks/useRiderLocation';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { usePermissions } from '@/hooks/usePermissions';

// Components
import RiderBottomNav, { RiderTab } from '@/components/rider/RiderBottomNav';
import { IncomingOrderSheet } from '@/components/rider/IncomingOrderSheet';
import LocationPermissionBlocker from '@/components/rider/LocationPermissionBlocker';

const RiderDashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    // Data fetching
    const { data: riderProfile, isLoading: profileLoading } = useRiderProfile();
    const { data: pendingRequests = [] } = usePendingRequests();
    const { data: activeDeliveries = [] } = useMyActiveDeliveries();

    // Location and permissions
    const {
        locationStatus,
        isTracking,
        lastLocation,
        retryPermission
    } = useRiderLocation(
        riderProfile?.id,
        riderProfile?.is_online || false
    );

    const currentSpeed = lastLocation?.speed || 0;
    const isLocationEnabled = locationStatus !== 'disabled' && locationStatus !== 'permission_denied';

    const { permissions, checkPermissions } = usePermissions();
    const { notifyNewOrder, stopRinging } = useNotificationSound();

    // Mutations
    const acceptRequest = useAcceptRequest();
    const updateStatus = useUpdateDeliveryStatus();
    const toggleOnline = useToggleOnlineStatus();

    // Local state
    const [alertRequest, setAlertRequest] = useState<RiderRequest | null>(null);
    const prevPendingCount = useRef(0);

    // Calculate counts for badges
    const pendingCount = pendingRequests.length;
    const activeCount = activeDeliveries.length;

    // Determine active tab from current path
    const getActiveTab = (): RiderTab => {
        const path = location.pathname;
        if (path === '/rider' || path === '/rider/') return 'home';
        if (path.includes('/rider/orders')) return 'orders';
        if (path.includes('/rider/map')) return 'map';
        if (path.includes('/rider/speed')) return 'speed';
        if (path.includes('/rider/earnings')) return 'earnings';
        if (path.includes('/rider/profile')) return 'profile';
        return 'home';
    };

    const activeTab = getActiveTab();

    const handleTabChange = (tab: RiderTab) => {
        if (tab === 'home') navigate('/rider');
        else if (tab === 'earnings') navigate('/rider/earnings');
        else navigate(`/rider/${tab}`);
    };

    // Detect new pending orders
    useEffect(() => {
        if (pendingRequests.length > prevPendingCount.current && pendingRequests.length > 0) {
            // New order arrived
            setAlertRequest(pendingRequests[0]);
            notifyNewOrder();
        }
        prevPendingCount.current = pendingRequests.length;
    }, [pendingRequests, notifyNewOrder]);

    // Auto offline if location disabled
    useEffect(() => {
        if (riderProfile?.is_online && (locationStatus === 'disabled' || locationStatus === 'permission_denied' || permissions.location !== 'granted')) {
            toast.error('Location access required', {
                description: 'Please enable GPS and grant location permission to receive nearby orders.'
            });
        }
    }, [locationStatus, permissions.location, riderProfile?.is_online]);

    // Handle accepting a request
    const handleAccept = async (id: string, type: 'rider_request' | 'order') => {
        try {
            await acceptRequest.mutateAsync({ requestId: id, requestType: type });
            stopRinging();
            setAlertRequest(null);
            toast.success('Request accepted! Navigate to pickup location.');
            // Navigate to map to show navigation
            navigate('/rider/map');
        } catch (error: any) {
            toast.error(error.message || 'Failed to accept request');
        }
    };

    // Handle rejecting a request
    const handleReject = (id: string) => {
        stopRinging();
        setAlertRequest(null);
    };

    // Toggle online status
    const handleToggleOnline = async (checked: boolean) => {
        if (checked && (locationStatus === 'disabled' || locationStatus === 'permission_denied' || permissions.location !== 'granted')) {
            // Use the retryPermission from useRiderLocation or the Capacitor direct call
            const { Geolocation } = await import('@capacitor/geolocation');
            await Geolocation.requestPermissions();
            retryPermission();
            checkPermissions();
        }

        try {
            await toggleOnline.mutateAsync(checked);
        } catch (error: any) {
            toast.error(error.message || 'Failed to update status');
        }
    };

    return (
        <div className="h-[100dvh] flex flex-col bg-black overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <Outlet context={{
                    riderProfile,
                    isOnline: riderProfile?.is_online || false,
                    onToggleOnline: handleToggleOnline,
                    isToggling: toggleOnline.isPending,
                    currentSpeed,
                    isTracking,
                    locationStatus,
                    lastLocation,
                    pendingCount,
                    activeCount,
                    profileLoading,
                    handleAccept,
                    handleReject,
                }} />
            </div>

            {/* Bottom Navigation */}
            <RiderBottomNav
                activeTab={activeTab}
                onTabChange={handleTabChange}
                pendingCount={pendingCount}
                activeCount={activeCount}
            />

            {/* Global Incoming Order Sheet Overlay */}
            <IncomingOrderSheet
                request={alertRequest}
                onAccept={handleAccept}
                onReject={handleReject}
                isLoading={acceptRequest.isPending}
            />

            {/* Global Location Permission Blocker */}
            <LocationPermissionBlocker
                permissionStatus={locationStatus}
                isLocationEnabled={isLocationEnabled}
                onRequestPermission={() => {
                    import('@capacitor/geolocation').then(({ Geolocation }) => {
                        Geolocation.requestPermissions().then(() => {
                            retryPermission();
                            checkPermissions();
                        });
                    });
                }}
                onCheckAgain={() => {
                    retryPermission();
                    checkPermissions();
                }}
            />
        </div>
    );
};

export default RiderDashboardLayout;

