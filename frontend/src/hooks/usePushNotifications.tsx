import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getFirebaseMessaging } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { toast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

// VAPID Key for Web Push (User needs to set this in .env)
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BM_replace_with_your_vapid_key';

interface PushState {
  isSupported: boolean;
  isPermissionGranted: boolean;
  isRegistered: boolean;
  platform: 'web' | 'android' | 'ios' | 'unknown';
  error: string | null;
  deviceToken: string | null;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>({
    isSupported: false,
    isPermissionGranted: false,
    isRegistered: false,
    platform: 'unknown',
    error: null,
    deviceToken: null,
  });
  const initAttemptedRef = useRef(false);

  // Detect platform
  const getPlatform = useCallback((): 'web' | 'android' | 'ios' | 'unknown' => {
    try {
      if (Capacitor.isNativePlatform()) {
        const platform = Capacitor.getPlatform();
        if (platform === 'android') return 'android';
        if (platform === 'ios') return 'ios';
      }
      if (typeof window !== 'undefined') return 'web';
    } catch {
      // Capacitor not available
    }
    return 'unknown';
  }, []);

  // Register token with backend
  const registerToken = useCallback(async (token: string) => {
    if (!user?.id) return;

    try {
      const platform = getPlatform();

      // Use backend endpoint to register
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://api-hcqvagallq-uc.a.run.app'}/api/push/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          role: user.user_metadata?.role || 'customer', // Default to customer if role not found
          device_token: token,
          platform: platform
        }),
      });

      if (!response.ok) {
        throw new Error('Backend registration failed');
      }

      console.log('[Push] Device registered with backend');
      setState(prev => ({ ...prev, isRegistered: true, deviceToken: token }));
    } catch (error) {
      console.error('[Push] Registration error:', error);
      setState(prev => ({ ...prev, error: 'Registration failed' }));
    }
  }, [user, getPlatform]);

  // Request permission and get token
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const platform = getPlatform();
    console.log('[Push] Requesting permission on platform:', platform);

    try {
      // 1. Request Permission
      let permission = 'default';
      if ('Notification' in window) {
        permission = await Notification.requestPermission();
      }

      const granted = permission === 'granted';
      setState(prev => ({ ...prev, isPermissionGranted: granted }));

      if (!granted) {
        console.warn('[Push] Permission denied');
        return false;
      }

      // 2. Get Token
      const messaging = getFirebaseMessaging();
      if (!messaging) {
        console.error('[Push] Messaging not initialized');
        return false;
      }

      // For web, we need VAPID key
      const options: any = {};
      if (platform === 'web') {
        if (!process.env.VITE_FIREBASE_VAPID_KEY && VAPID_KEY.startsWith('BM_')) {
          console.warn('[Push] VAPID Key not set! Web Push might fail.');
        }
        options.vapidKey = VAPID_KEY;
      }

      const token = await getToken(messaging, options);

      if (token) {
        console.log('[Push] FCM Token:', token);
        await registerToken(token);
        return true;
      } else {
        console.warn('[Push] No registration token available.');
        return false;
      }

    } catch (err) {
      console.error('[Push] Permission/Token error:', err);
      setState(prev => ({ ...prev, error: 'Failed to request permission or get token' }));
      return false;
    }
  }, [getPlatform, registerToken]);

  // Initialize push notifications
  const initializePush = useCallback(async () => {
    if (!user?.id || initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    const platform = getPlatform();
    console.log('[Push] Initializing push for platform:', platform, 'user:', user.id);

    setState(prev => ({ ...prev, platform }));

    // Check support
    if (!('Notification' in window) && platform === 'web') {
      console.log('[Push] This browser does not support desktop notification');
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }
    setState(prev => ({ ...prev, isSupported: true }));

    // If already granted, try to get token silently
    if (Notification.permission === 'granted') {
      setState(prev => ({ ...prev, isPermissionGranted: true }));
      // Initializing messaging
      const messaging = getFirebaseMessaging();
      if (messaging) {
        try {
          // Listen for foreground messages
          onMessage(messaging, (payload) => {
            console.log('[Push] Foreground Message:', payload);

            const link = payload.data?.url || payload.data?.click_action;

            toast({
              title: payload.notification?.title || 'New Notification',
              description: payload.notification?.body,
              duration: 5000,
              action: link ? (
                <div
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 rounded-md text-xs flex items-center justify-center cursor-pointer"
                  onClick={() => window.location.href = link}
                >
                  View
                </div>
              ) : undefined,
            });
          });

          // Refresh token if needed
          // Note: getToken will return current token if valid
          requestPermission();
        } catch (e) {
          console.error('[Push] Init error', e);
        }
      }
    }

  }, [user, getPlatform, requestPermission]);

  // Handle cleanup
  const cleanupTokens = useCallback(async () => {
    // TODO: Could call backend to remove token
    setState({
      isSupported: false,
      isPermissionGranted: false,
      isRegistered: false,
      platform: 'unknown',
      error: null,
      deviceToken: null,
    });
    initAttemptedRef.current = false;
  }, []);

  // Initialize on mount/user change
  useEffect(() => {
    if (user) {
      initializePush();
    }
  }, [user, initializePush]);

  return {
    ...state,
    requestPermission,
    reinitialize: () => {
      initAttemptedRef.current = false;
      initializePush();
    },
    cleanup: cleanupTokens,
  };
};

export default usePushNotifications;
