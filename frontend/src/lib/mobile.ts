// Mobile Native Capabilities for Fast Haazir
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation, Position } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * Check if running on native mobile platform
 */
export const isMobile = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Get platform (ios | android | web)
 */
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

/**
 * Initialize mobile app features
 */
export const initializeMobileApp = async () => {
  if (!isMobile()) {
    console.log('[Mobile] Running on web, skipping native initialization');
    return;
  }

  try {
    console.log('[Mobile] Initializing native features...');

    // Configure Status Bar
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#10b981' });
    await StatusBar.show();

    // Hide Splash Screen after initialization
    await SplashScreen.hide();

    // Configure Keyboard
    Keyboard.setAccessoryBarVisible({ isVisible: true });

    // Setup App State Listeners
    App.addListener('appStateChange', (state) => {
      console.log('[Mobile] App state changed:', state.isActive ? 'active' : 'background');
    });

    // Setup Back Button Handler
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });

    console.log('[Mobile] Native features initialized ✓');
  } catch (error) {
    console.error('[Mobile] Initialization error:', error);
  }
};

/**
 * Camera - Take photo or pick from gallery
 */
export const takePicture = async (fromGallery: boolean = false): Promise<string | null> => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: fromGallery ? CameraSource.Photos : CameraSource.Camera,
      width: 1024,
      height: 1024,
      correctOrientation: true
    });

    return image.dataUrl || null;
  } catch (error) {
    console.error('[Mobile] Camera error:', error);
    return null;
  }
};

/**
 * Geolocation - Get current position
 */
export const getCurrentLocation = async (): Promise<Position | null> => {
  try {
    const permission = await Geolocation.requestPermissions();
    
    if (permission.location !== 'granted') {
      console.error('[Mobile] Location permission denied');
      return null;
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });

    return position;
  } catch (error) {
    console.error('[Mobile] Geolocation error:', error);
    return null;
  }
};

/**
 * Geolocation - Watch position (for rider tracking)
 */
export const watchLocation = (
  callback: (position: Position) => void
): string | null => {
  if (!isMobile()) {
    // Fallback to browser geolocation
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        callback({
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed
          },
          timestamp: pos.timestamp
        });
      },
      (error) => console.error('[Mobile] Watch location error:', error),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return watchId.toString();
  }

  let watchId: string | null = null;

  Geolocation.watchPosition(
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
    callback
  ).then((id) => {
    watchId = id;
  });

  return watchId;
};

/**
 * Clear location watch
 */
export const clearLocationWatch = async (watchId: string) => {
  if (!isMobile()) {
    navigator.geolocation.clearWatch(parseInt(watchId));
    return;
  }

  await Geolocation.clearWatch({ id: watchId });
};

/**
 * Push Notifications - Register for push
 */
export const registerPushNotifications = async (): Promise<string | null> => {
  if (!isMobile()) {
    console.log('[Mobile] Push notifications only available on native platforms');
    return null;
  }

  try {
    const permission = await PushNotifications.requestPermissions();
    
    if (permission.receive !== 'granted') {
      console.error('[Mobile] Push notification permission denied');
      return null;
    }

    await PushNotifications.register();

    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token) => {
        console.log('[Mobile] Push registration success:', token.value);
        resolve(token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('[Mobile] Push registration error:', error);
        resolve(null);
      });
    });
  } catch (error) {
    console.error('[Mobile] Push notification error:', error);
    return null;
  }
};

/**
 * Push Notifications - Setup listeners
 */
export const setupPushNotificationListeners = (
  onNotificationReceived: (notification: any) => void,
  onNotificationClicked: (notification: any) => void
) => {
  if (!isMobile()) return;

  PushNotifications.addListener('pushNotificationReceived', onNotificationReceived);
  PushNotifications.addListener('pushNotificationActionPerformed', onNotificationClicked);
};

/**
 * Haptic Feedback - Vibrate on action
 */
export const hapticImpact = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (!isMobile()) return;

  try {
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy
    };

    await Haptics.impact({ style: styleMap[style] });
  } catch (error) {
    console.error('[Mobile] Haptic feedback error:', error);
  }
};

/**
 * Haptic Feedback - Vibrate on notification
 */
export const hapticNotification = async (type: 'success' | 'warning' | 'error' = 'success') => {
  if (!isMobile()) return;

  try {
    await Haptics.notification({ type });
  } catch (error) {
    console.error('[Mobile] Haptic notification error:', error);
  }
};

/**
 * Share - Native share dialog
 */
export const shareContent = async (title: string, text: string, url?: string) => {
  if (!isMobile()) {
    // Fallback to Web Share API
    if (navigator.share) {
      await navigator.share({ title, text, url });
    } else {
      console.log('[Mobile] Share not supported on this platform');
    }
    return;
  }

  // Use Capacitor Share plugin if needed
  console.log('[Mobile] Share:', { title, text, url });
};

/**
 * Keyboard - Show/Hide
 */
export const showKeyboard = async () => {
  if (!isMobile()) return;
  await Keyboard.show();
};

export const hideKeyboard = async () => {
  if (!isMobile()) return;
  await Keyboard.hide();
};

/**
 * Keyboard - Listen for events
 */
export const setupKeyboardListeners = (
  onShow: (info: any) => void,
  onHide: () => void
) => {
  if (!isMobile()) return;

  Keyboard.addListener('keyboardWillShow', onShow);
  Keyboard.addListener('keyboardWillHide', onHide);
};

/**
 * Exit App
 */
export const exitApp = async () => {
  if (!isMobile()) {
    console.log('[Mobile] Exit app only available on native platforms');
    return;
  }

  await App.exitApp();
};

/**
 * Get App Info
 */
export const getAppInfo = async () => {
  if (!isMobile()) {
    return {
      name: 'Fast Haazir',
      id: 'com.fasthaazir.app',
      version: '1.0.0',
      build: '1'
    };
  }

  return await App.getInfo();
};

export default {
  isMobile,
  getPlatform,
  initializeMobileApp,
  takePicture,
  getCurrentLocation,
  watchLocation,
  clearLocationWatch,
  registerPushNotifications,
  setupPushNotificationListeners,
  hapticImpact,
  hapticNotification,
  shareContent,
  showKeyboard,
  hideKeyboard,
  setupKeyboardListeners,
  exitApp,
  getAppInfo
};
