import { useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalInstance) => void>;
    OneSignal?: OneSignalInstance;
    __oneSignalInitialized?: boolean;
  }
}

interface OneSignalInstance {
  init: (config: Record<string, unknown>) => Promise<void>;
  User: {
    PushSubscription: {
      id: string | null;
      optedIn: boolean;
      addEventListener: (event: string, callback: () => void) => void;
    };
  };
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  Notifications: {
    requestPermission: () => Promise<void>;
    addEventListener: (event: string, callback: (data: NotificationEvent) => void) => void;
  };
}

interface NotificationEvent {
  notification: {
    additionalData?: {
      route?: string;
    };
  };
}

interface PushContextType {
  requestPermission: () => Promise<void>;
  isRegistered: boolean;
  platform: string;
}

const PushContext = createContext<PushContextType>({
  requestPermission: async () => {},
  isRegistered: false,
  platform: 'unknown',
});

export const usePush = () => useContext(PushContext);

const ONESIGNAL_APP_ID = '2a4abb59-f4b5-444b-8576-29ca47f9c7a2';

interface Props {
  children: ReactNode;
}

export default function PushNotificationProvider({ children }: Props) {
  const { user } = useAuth();
  
  // Detect platform
  const getPlatform = (): string => {
    try {
      if (Capacitor.isNativePlatform()) {
        return Capacitor.getPlatform();
      }
    } catch {
      // Capacitor not available
    }
    return 'web';
  };
  
  const platform = getPlatform();

  const saveDeviceToken = useCallback(async (playerId: string | null) => {
    if (!user || !playerId) {
      console.log('[Push] Cannot save token - missing user or playerId:', { userId: user?.id, playerId });
      return false;
    }

    console.log('[Push] Saving device token for user:', user.id, 'platform:', platform, 'token:', playerId);

    try {
      // First, check if token already exists for this user
      const { data: existing, error: fetchError } = await supabase
        .from('push_device_tokens')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_token', playerId)
        .maybeSingle();

      if (fetchError) {
        console.error('[Push] Error checking existing token:', fetchError);
      }

      if (existing) {
        // Update existing token
        const { error } = await supabase
          .from('push_device_tokens')
          .update({ 
            updated_at: new Date().toISOString(),
            platform: platform,
          })
          .eq('id', existing.id);
        
        if (error) throw error;
        console.log('[Push] Device token updated:', playerId);
        return true;
      } else {
        // Delete old tokens for this user on same platform (keep one per platform)
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
            device_token: playerId,
            platform: platform,
            updated_at: new Date().toISOString(),
          });
        
        if (error) throw error;
        console.log('[Push] Device token saved:', playerId);
        return true;
      }
    } catch (err) {
      console.error('[Push] Error saving device token:', err);
      return false;
    }
  }, [user, platform]);

  const initOneSignal = useCallback(async () => {
    if (!ONESIGNAL_APP_ID || typeof window === 'undefined') {
      console.log('[Push] OneSignal not initialized - missing app ID or not in browser');
      return;
    }

    console.log('[Push] Initializing OneSignal for user:', user?.id, 'platform:', platform);

    // Load SDK
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    if (!document.getElementById('onesignal-sdk')) {
      const script = document.createElement('script');
      script.id = 'onesignal-sdk';
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      document.head.appendChild(script);
      console.log('[Push] OneSignal SDK script loaded');
    }

    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        // Prevent double initialization
        if (window.__oneSignalInitialized) {
          console.log('[Push] OneSignal already initialized, skipping');
          
          // Still try to login and save token
          if (user?.id) {
            await OneSignal.login(user.id);
            const playerId = OneSignal.User.PushSubscription.id;
            if (playerId) {
              await saveDeviceToken(playerId);
            }
          }
          return;
        }

        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
        });
        
        window.__oneSignalInitialized = true;
        console.log('[Push] OneSignal initialized successfully');

        // Login with external user ID first
        if (user?.id) {
          await OneSignal.login(user.id);
          console.log('[Push] Logged in to OneSignal with user:', user.id);
        }

        // Save subscription ID
        const playerId = OneSignal.User.PushSubscription.id;
        const optedIn = OneSignal.User.PushSubscription.optedIn;
        console.log('[Push] Current subscription state:', { playerId, optedIn });

        if (playerId && user) {
          await saveDeviceToken(playerId);
        } else if (!optedIn) {
          console.log('[Push] User not opted in, requesting permission...');
          // Auto-request permission for Android/iOS
          if (platform === 'android' || platform === 'ios') {
            try {
              await OneSignal.Notifications.requestPermission();
              const newPlayerId = OneSignal.User.PushSubscription.id;
              if (newPlayerId && user) {
                await saveDeviceToken(newPlayerId);
              }
            } catch (permErr) {
              console.log('[Push] Permission request failed or denied:', permErr);
            }
          }
        }

        // Listen for subscription changes
        OneSignal.User.PushSubscription.addEventListener('change', async () => {
          const newId = OneSignal.User.PushSubscription.id;
          console.log('[Push] Subscription changed, new ID:', newId);
          if (newId && user) {
            await saveDeviceToken(newId);
          }
        });

        // Handle notification clicks for deep linking
        OneSignal.Notifications.addEventListener('click', (event) => {
          const route = event.notification?.additionalData?.route;
          console.log('[Push] Notification clicked, route:', route);
          if (route && typeof window !== 'undefined') {
            window.location.href = route;
          }
        });
      } catch (err) {
        console.error('[Push] OneSignal initialization error:', err);
      }
    });
  }, [user, saveDeviceToken, platform]);

  const requestPermission = useCallback(async () => {
    if (window.OneSignal) {
      await window.OneSignal.Notifications.requestPermission();
      // Save token after permission granted
      const playerId = window.OneSignal.User?.PushSubscription?.id;
      if (playerId && user) {
        await saveDeviceToken(playerId);
      }
    }
  }, [user, saveDeviceToken]);

  useEffect(() => {
    if (user) {
      initOneSignal();
    }
  }, [user, initOneSignal]);

  const isRegistered = !!(window.OneSignal?.User?.PushSubscription?.id);

  return (
    <PushContext.Provider value={{ requestPermission, isRegistered, platform }}>
      {children}
    </PushContext.Provider>
  );
}