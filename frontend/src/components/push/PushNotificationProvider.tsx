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
  requestPermission: async () => { },
  isRegistered: false,
  platform: 'unknown',
});

export const usePush = () => useContext(PushContext);

const ONESIGNAL_APP_ID = '4526e014-9efc-4488-b832-e4d6eb674978';

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
    if (!ONESIGNAL_APP_ID) return;

    console.log('[Push] Initializing OneSignal for user:', user?.id, 'platform:', platform);

    // ==========================================
    // NATIVE (Android/iOS) Initialization
    // ==========================================
    if (Capacitor.isNativePlatform()) {
      try {
        // defined in window by onesignal-cordova-plugin
        const OneSignal = (window as any).OneSignal;

        if (!OneSignal) {
          console.error('[Push] OneSignal native plugin not found!');
          return;
        }

        // Initialize (v5+ API)
        OneSignal.initialize(ONESIGNAL_APP_ID);

        // Request Permission
        const hasPermission = await OneSignal.Notifications.permissionNative;
        if (hasPermission !== 2) { // 2 = Authorized
          console.log('[Push] Requesting native permission...');
          await OneSignal.Notifications.requestPermission(true);
        }

        // Login
        if (user?.id) {
          OneSignal.login(user.id);
          console.log('[Push] Native Login:', user.id);
        }

        // Get Subscription ID
        const getId = () => {
          const id = OneSignal.User.pushSubscription.id; // Note: lowercase 'pushSubscription' in some versions, check docs. 
          // Actually v5 JS SDK is User.PushSubscription usually. 
          // Cordova v5 might be OneSignal.User.pushSubscription. 
          // Let's assume consistent casing or check safety.
          return OneSignal.User.pushSubscription?.id || OneSignal.User.PushSubscription?.id;
        };

        const playerId = getId();
        if (playerId) {
          await saveDeviceToken(playerId);
        }

        // Listen for changes
        OneSignal.User.pushSubscription.addEventListener('change', async (event: any) => {
          const newId = event.curr?.id || getId();
          console.log('[Push] Native subscription changed:', newId);
          if (newId && user) {
            await saveDeviceToken(newId);
          }
        });

        // Listen for clicks
        OneSignal.Notifications.addEventListener('click', (event: any) => {
          console.log('[Push] Native Notification Click:', event);
          const data = event.notification?.additionalData;
          if (data?.route) {
            window.location.href = data.route;
          }
        });

        return; // Exit, handled native

      } catch (err) {
        console.error('[Push] Native Init Error:', err);
      }
      return;
    }

    // ==========================================
    // WEB Initialization (Existing Logic)
    // ==========================================
    if (typeof window === 'undefined') return;

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
        if (window.__oneSignalInitialized) {
          if (user?.id) {
            await OneSignal.login(user.id);
            const playerId = OneSignal.User.PushSubscription.id;
            if (playerId) await saveDeviceToken(playerId);
          }
          return;
        }

        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
        });

        window.__oneSignalInitialized = true;
        console.log('[Push] OneSignal Web Params Initialized');

        if (user?.id) {
          await OneSignal.login(user.id);
        }

        const playerId = OneSignal.User.PushSubscription.id;
        if (playerId && user) {
          await saveDeviceToken(playerId);
        } else if (OneSignal.User.PushSubscription.optedIn === false) {
          // Request permission if not blocked
          // OneSignal.Notifications.requestPermission(); 
          // Leave manual request for web to avoid popup spam
        }

        OneSignal.User.PushSubscription.addEventListener('change', async () => {
          const newId = OneSignal.User.PushSubscription.id;
          if (newId && user) await saveDeviceToken(newId);
        });

        OneSignal.Notifications.addEventListener('click', (event) => {
          const route = event.notification?.additionalData?.route;
          if (route) window.location.href = route;
        });

      } catch (err) {
        console.error('[Push] OneSignal Web initialization error:', err);
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