import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Capacitor } from '@capacitor/core';

/**
 * Cross-platform Push Notification Hook
 * Handles both Web (OneSignal) and Android (FCM via OneSignal) push notifications
 * Includes Android 13+ permission handling
 */

interface PushState {
  isSupported: boolean;
  isPermissionGranted: boolean;
  isRegistered: boolean;
  platform: 'web' | 'android' | 'ios' | 'unknown';
  error: string | null;
}

const ONESIGNAL_APP_ID = '2a4abb59-f4b5-444b-8576-29ca47f9c7a2';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>({
    isSupported: false,
    isPermissionGranted: false,
    isRegistered: false,
    platform: 'unknown',
    error: null,
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

  // Save device token to Supabase
  const saveDeviceToken = useCallback(async (token: string, platform: string): Promise<boolean> => {
    if (!user?.id || !token) {
      console.log('[Push] Cannot save token - missing user or token');
      return false;
    }

    console.log(`[Push] Saving ${platform} token for user:`, user.id);

    try {
      // Check if token already exists for this user
      const { data: existing, error: fetchError } = await supabase
        .from('push_device_tokens')
        .select('id, platform')
        .eq('user_id', user.id)
        .eq('device_token', token)
        .maybeSingle();

      if (fetchError) {
        console.error('[Push] Error checking existing token:', fetchError);
      }

      if (existing) {
        // Update existing token's timestamp
        const { error } = await supabase
          .from('push_device_tokens')
          .update({ 
            updated_at: new Date().toISOString(),
            platform: platform, // Update platform in case it changed
          })
          .eq('id', existing.id);

        if (error) {
          console.error('[Push] Error updating token:', error);
          return false;
        }
        console.log('[Push] Token updated successfully');
      } else {
        // Delete any old tokens for this user on same platform (one device per platform)
        await supabase
          .from('push_device_tokens')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', platform);

        // Insert new token
        const { error } = await supabase
          .from('push_device_tokens')
          .insert({
            user_id: user.id,
            device_token: token,
            platform: platform,
            updated_at: new Date().toISOString(),
          });

        if (error) {
          console.error('[Push] Error inserting token:', error);
          return false;
        }
        console.log('[Push] Token saved successfully');
      }

      return true;
    } catch (err) {
      console.error('[Push] Error saving device token:', err);
      return false;
    }
  }, [user]);

  // Request notification permission (Android 13+ / Web)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const platform = getPlatform();
    console.log('[Push] Requesting permission on platform:', platform);

    try {
      if (platform === 'android' || platform === 'ios') {
        // For native platforms, use Capacitor or OneSignal native SDK
        if (window.OneSignal) {
          await window.OneSignal.Notifications.requestPermission();
          const optedIn = window.OneSignal?.User?.PushSubscription?.optedIn;
          setState(prev => ({ ...prev, isPermissionGranted: !!optedIn }));
          return !!optedIn;
        }
        
        // Fallback: Check Notification API (works in WebView)
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          const granted = permission === 'granted';
          setState(prev => ({ ...prev, isPermissionGranted: granted }));
          return granted;
        }
      } else if (platform === 'web') {
        // Web: Use Notification API or OneSignal
        if (window.OneSignal) {
          await window.OneSignal.Notifications.requestPermission();
          const optedIn = window.OneSignal?.User?.PushSubscription?.optedIn;
          setState(prev => ({ ...prev, isPermissionGranted: !!optedIn }));
          return !!optedIn;
        }
        
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          const granted = permission === 'granted';
          setState(prev => ({ ...prev, isPermissionGranted: granted }));
          return granted;
        }
      }
    } catch (err) {
      console.error('[Push] Permission request error:', err);
      setState(prev => ({ ...prev, error: 'Failed to request permission' }));
    }

    return false;
  }, [getPlatform]);

  // Initialize push notifications
  const initializePush = useCallback(async () => {
    if (!user?.id || initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    const platform = getPlatform();
    console.log('[Push] Initializing push for platform:', platform, 'user:', user.id);

    setState(prev => ({ ...prev, platform }));

    // Check if push notifications are supported
    const isSupported = 'Notification' in window || platform === 'android' || platform === 'ios';
    if (!isSupported) {
      console.log('[Push] Notifications not supported');
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    setState(prev => ({ ...prev, isSupported: true }));

    // Check current permission status
    let hasPermission = false;
    if ('Notification' in window) {
      hasPermission = Notification.permission === 'granted';
    }
    setState(prev => ({ ...prev, isPermissionGranted: hasPermission }));

    // Load and initialize OneSignal SDK
    await loadOneSignalSDK();

    // Initialize OneSignal
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          // Check if already initialized
          if (window.__oneSignalInitialized) {
            console.log('[Push] OneSignal already initialized');
            return;
          }

          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: { enable: false },
            // Android-specific settings
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
          });

          window.__oneSignalInitialized = true;
          console.log('[Push] OneSignal initialized');

          // Login with external user ID
          await OneSignal.login(user.id);
          console.log('[Push] Logged in to OneSignal');

          // Get subscription info
          const playerId = OneSignal.User.PushSubscription.id;
          const optedIn = OneSignal.User.PushSubscription.optedIn;
          
          console.log('[Push] Subscription state:', { playerId, optedIn });

          if (playerId) {
            const saved = await saveDeviceToken(playerId, platform);
            setState(prev => ({ 
              ...prev, 
              isRegistered: saved,
              isPermissionGranted: optedIn,
            }));
          } else if (!optedIn) {
            // Auto-request permission for Android/iOS
            if (platform === 'android' || platform === 'ios') {
              console.log('[Push] Auto-requesting permission for native app');
              const granted = await requestPermission();
              if (granted) {
                const newPlayerId = OneSignal.User.PushSubscription.id;
                if (newPlayerId) {
                  await saveDeviceToken(newPlayerId, platform);
                  setState(prev => ({ ...prev, isRegistered: true }));
                }
              }
            }
          }

          // Listen for subscription changes
          OneSignal.User.PushSubscription.addEventListener('change', async () => {
            const newId = OneSignal.User.PushSubscription.id;
            console.log('[Push] Subscription changed:', newId);
            if (newId) {
              await saveDeviceToken(newId, platform);
              setState(prev => ({ ...prev, isRegistered: true }));
            }
          });

          // Handle notification clicks
          OneSignal.Notifications.addEventListener('click', (event: any) => {
            const route = event.notification?.additionalData?.route;
            console.log('[Push] Notification clicked, route:', route);
            if (route && typeof window !== 'undefined') {
              window.location.href = route;
            }
          });

        } catch (err) {
          console.error('[Push] OneSignal init error:', err);
          setState(prev => ({ ...prev, error: 'Failed to initialize push notifications' }));
        }
      });
    }
  }, [user, getPlatform, saveDeviceToken, requestPermission]);

  // Load OneSignal SDK
  const loadOneSignalSDK = async () => {
    if (typeof window === 'undefined') return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];

    if (!document.getElementById('onesignal-sdk')) {
      return new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.id = 'onesignal-sdk';
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.defer = true;
        script.onload = () => {
          console.log('[Push] OneSignal SDK loaded');
          resolve();
        };
        script.onerror = () => {
          console.error('[Push] Failed to load OneSignal SDK');
          resolve();
        };
        document.head.appendChild(script);
      });
    }
  };

  // Cleanup old tokens when user logs out
  const cleanupTokens = useCallback(async () => {
    if (!user?.id) return;
    
    console.log('[Push] Cleaning up tokens for user:', user.id);
    
    try {
      // Logout from OneSignal
      if (window.OneSignal) {
        await window.OneSignal.logout();
      }
    } catch (err) {
      console.error('[Push] Cleanup error:', err);
    }
    
    initAttemptedRef.current = false;
    setState({
      isSupported: false,
      isPermissionGranted: false,
      isRegistered: false,
      platform: 'unknown',
      error: null,
    });
  }, [user]);

  // Initialize when user logs in
  useEffect(() => {
    if (user) {
      initializePush();
    } else {
      // Reset when user logs out
      initAttemptedRef.current = false;
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
