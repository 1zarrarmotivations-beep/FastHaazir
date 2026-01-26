// Firebase SDK - Multi-auth support (Phone OTP, Email/Password, Google)
// Optimized for both Web and Android APK (Capacitor)
// CRITICAL: This file MUST be identical between frontend/src and src directories
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  PhoneAuthProvider,
  onAuthStateChanged, 
  signOut,
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  initializeAuth
} from 'firebase/auth';
import { supabase } from '@/integrations/supabase/client';

// Use 'any' for Firebase instances to avoid complex type inference
let firebaseApp: any = null;
let firebaseAuth: any = null;
let googleProvider: any = null;
let configLoaded = false;
let configValid = false;
let configFetchAttempts = 0;
const MAX_CONFIG_FETCH_ATTEMPTS = 3;

/**
 * Detect if running in Capacitor (native app) - robust detection
 * This function is CRITICAL for APK to work correctly
 */
const detectNativeApp = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    
    // Primary check: Capacitor object exists
    const cap = (window as any)?.Capacitor;
    if (!cap) return false;
    
    // Check if getPlatform is available and returns a native platform
    const platform = cap?.getPlatform?.();
    const isNativePlatform = platform === 'android' || platform === 'ios';
    
    // Additional checks for native bridge
    const hasNativeBridge = !!(window as any)?.AndroidBridge || 
                            !!(window as any)?.webkit?.messageHandlers?.bridge;
    
    // Check if isNativePlatform is explicitly true
    const isNativeExplicit = cap?.isNativePlatform?.() === true;
    
    const result = isNativePlatform || isNativeExplicit || hasNativeBridge;
    
    console.log('[Firebase] Platform detection:', {
      platform,
      isNativePlatform,
      hasNativeBridge,
      isNativeExplicit,
      result
    });
    
    return result;
  } catch (e) {
    console.log('[Firebase] Platform detection error:', e);
    return false;
  }
};

const isNativeApp = detectNativeApp();

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

/**
 * Fetch Firebase config from edge function (secrets stored securely)
 * Includes retry logic for APK network timing issues
 */
export const fetchFirebaseConfig = async (): Promise<FirebaseConfig | null> => {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  while (configFetchAttempts < MAX_CONFIG_FETCH_ATTEMPTS) {
    configFetchAttempts++;
    
    try {
      console.log(`[Firebase] Fetching config (attempt ${configFetchAttempts}/${MAX_CONFIG_FETCH_ATTEMPTS})...`);
      console.log('[Firebase] Platform:', isNativeApp ? 'Android APK' : 'Web');
      
      const { data, error } = await supabase.functions.invoke('get-firebase-config');
      
      if (error) {
        console.error('[Firebase] Config fetch error:', error);
        if (configFetchAttempts < MAX_CONFIG_FETCH_ATTEMPTS) {
          await delay(1000 * configFetchAttempts); // Exponential backoff
          continue;
        }
        return null;
      }
      
      if (!data?.success || !data?.isValid) {
        console.error('[Firebase] Config not valid:', data);
        return null;
      }
      
      console.log('[Firebase] Config fetched successfully ✓');
      console.log('[Firebase] Project ID:', data.config.projectId);
      return data.config as FirebaseConfig;
    } catch (err) {
      console.error('[Firebase] Config fetch exception:', err);
      if (configFetchAttempts < MAX_CONFIG_FETCH_ATTEMPTS) {
        await delay(1000 * configFetchAttempts);
        continue;
      }
      return null;
    }
  }
  
  return null;
};

/**
 * Initialize Firebase with config from edge function
 * Handles platform-specific persistence and auth initialization
 */
export const initializeFirebase = async (): Promise<boolean> => {
  if (configLoaded) {
    return configValid;
  }
  
  try {
    // Check if Firebase is already initialized
    if (getApps().length > 0) {
      console.log('[Firebase] Already initialized, reusing existing app');
      firebaseApp = getApp();
      firebaseAuth = getAuth(firebaseApp);
      googleProvider = new GoogleAuthProvider();
      configLoaded = true;
      configValid = true;
      return true;
    }
    
    const config = await fetchFirebaseConfig();
    
    if (!config) {
      console.error('[Firebase] Failed to fetch config after retries');
      configLoaded = true;
      configValid = false;
      return false;
    }
    
    console.log('[Firebase] Initializing app...', isNativeApp ? '(Android APK)' : '(Web Browser)');
    firebaseApp = initializeApp(config);
    
    // Initialize auth with platform-appropriate persistence
    if (isNativeApp) {
      // For Android APK: Use indexedDB as primary, with localStorage fallback
      try {
        firebaseAuth = initializeAuth(firebaseApp, {
          persistence: [indexedDBLocalPersistence, browserLocalPersistence]
        });
        console.log('[Firebase] Auth initialized with indexedDB persistence (Android APK)');
      } catch (e: any) {
        // If initializeAuth fails (already initialized), fall back to getAuth
        if (e?.code === 'auth/already-initialized') {
          firebaseAuth = getAuth(firebaseApp);
          console.log('[Firebase] Auth already initialized, using existing instance');
        } else {
          throw e;
        }
      }
    } else {
      // For Web: Use default persistence (automatic best choice)
      firebaseAuth = getAuth(firebaseApp);
      console.log('[Firebase] Auth initialized with default persistence (Web)');
    }
    
    firebaseAuth.languageCode = 'en';
    
    // Initialize Google Auth Provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    configLoaded = true;
    configValid = true;
    
    console.log('[Firebase] ✓ Initialized successfully');
    console.log('[Firebase] ✓ Project:', config.projectId);
    console.log('[Firebase] ✓ Auth Domain:', config.authDomain);
    console.log('[Firebase] ✓ Platform:', isNativeApp ? 'Android APK' : 'Web');
    return true;
  } catch (err) {
    console.error('[Firebase] Initialization error:', err);
    configLoaded = true;
    configValid = false;
    return false;
  }
};

/**
 * Get Firebase Auth instance
 */
export const getFirebaseAuth = (): any => {
  return firebaseAuth;
};

/**
 * Get Google Auth Provider
 */
export const getGoogleProvider = (): any => {
  return googleProvider;
};

/**
 * Check if Firebase is properly configured
 */
export const isFirebaseConfigured = (): boolean => {
  return configValid;
};

/**
 * Check if Firebase config has been loaded
 */
export const isConfigLoaded = (): boolean => {
  return configLoaded;
};

/**
 * Check if running in native app (Capacitor Android)
 */
export const isRunningInNativeApp = (): boolean => {
  return isNativeApp;
};

/**
 * Reset config state (useful for testing)
 */
export const resetConfigState = (): void => {
  configLoaded = false;
  configValid = false;
  configFetchAttempts = 0;
};

// Re-export Firebase auth functions
export { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  PhoneAuthProvider,
  onAuthStateChanged, 
  signOut 
};
