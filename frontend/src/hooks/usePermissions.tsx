import { useState, useCallback, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { VoiceRecorder } from 'capacitor-voice-recorder';

export type PermissionType = 'location' | 'notifications' | 'camera' | 'microphone';
export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

export interface PermissionState {
    location: PermissionStatus;
    notifications: PermissionStatus;
    camera: PermissionStatus;
    microphone: PermissionStatus;
}

export const usePermissions = () => {
    const [permissions, setPermissions] = useState<PermissionState>({
        location: 'unknown',
        notifications: 'unknown',
        camera: 'unknown',
        microphone: 'unknown',
    });

    const checkPermissions = useCallback(async () => {
        if (!Capacitor.isNativePlatform()) {
            // Web fallback (mostly mock or basic API)
            setPermissions({
                location: 'granted',
                notifications: 'granted',
                camera: 'granted',
                microphone: 'granted'
            });
            return;
        }

        try {
            // Location
            let locationStatus: PermissionStatus = 'unknown';
            try {
                const loc = await Geolocation.checkPermissions();
                locationStatus = loc.location as PermissionStatus;
            } catch (e) {
                console.warn('Location check failed', e);
            }

            // Notifications
            let notificationStatus: PermissionStatus = 'unknown';
            try {
                const pushStatus = await PushNotifications.checkPermissions();
                notificationStatus = pushStatus.receive as PermissionStatus;
            } catch (e) {
                console.warn('Push notification permission check failed', e);
            }

            // Camera
            let cameraStatus: PermissionStatus = 'unknown';
            try {
                const camStatus = await Camera.checkPermissions();
                cameraStatus = camStatus.camera as PermissionStatus;
            } catch (e) {
                console.warn('Camera permission check failed', e);
            }

            // Microphone via Capacitor Voice Recorder
            let micStatus: PermissionStatus = 'unknown';
            try {
                const result = await VoiceRecorder.hasAudioRecordingPermission();
                micStatus = result.value ? 'granted' : 'prompt';
            } catch (e) {
                console.warn('Microphone permission check failed', e);
            }

            setPermissions({
                location: locationStatus,
                notifications: notificationStatus,
                camera: cameraStatus,
                microphone: micStatus,
            });

        } catch (error) {
            console.error('Error checking permissions:', error);
        }
    }, []);

    const requestPermission = useCallback(async (type: PermissionType): Promise<PermissionStatus> => {
        if (!Capacitor.isNativePlatform()) return 'granted';

        try {
            let status: PermissionStatus = 'denied';

            switch (type) {
                case 'location':
                    const loc = await Geolocation.requestPermissions();
                    status = loc.location as PermissionStatus;
                    break;

                case 'notifications':
                    const push = await PushNotifications.requestPermissions();
                    status = push.receive as PermissionStatus;
                    break;

                case 'camera':
                    const cam = await Camera.requestPermissions();
                    status = cam.camera as PermissionStatus;
                    break;

                case 'microphone':
                    try {
                        const result = await VoiceRecorder.requestAudioRecordingPermission();
                        status = result.value ? 'granted' : 'denied';
                    } catch (e) {
                        console.error('Mic request error', e);
                        status = 'denied';
                    }
                    break;

                default:
                    status = 'denied';
            }

            // Refresh state immediately after request
            await checkPermissions();
            return status;

        } catch (error) {
            console.error(`Error requesting ${type} permission:`, error);
            return 'denied';
        }
    }, [checkPermissions]);

    useEffect(() => {
        checkPermissions();

        const listener = App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
                checkPermissions();
            }
        });

        return () => {
            listener.then(l => l.remove());
        };
    }, [checkPermissions]);

    return {
        permissions,
        checkPermissions,
        requestPermission
    };
};
