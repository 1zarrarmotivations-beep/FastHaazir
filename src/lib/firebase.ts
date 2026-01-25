// Firebase SDK - Multi-auth support (Phone OTP, Email/Password, Google)
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

// Detect if running in Capacitor (native app)
const isNativeApp = typeof (window as any)?.Capacitor !== 'undefined';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

/**
 * Fetch Firebase config from edge function (secrets stored securely)
 */
export const fetchFirebaseConfig = async (): Promise<FirebaseConfig | null> => {
  try {
    console.log('[Firebase] Fetching config from edge function...');
    const { data, error } = await supabase.functions.invoke('get-firebase-config');
    
    if (error) {
      console.error('[Firebase] Failed to fetch config:', error);
      return null;
    }
    
    if (!data?.success || !data?.isValid) {
      console.error('[Firebase] Config not valid:', data);
      return null;
    }
    
    console.log('[Firebase] Config fetched successfully for project:', data.config.projectId);
    return data.config as FirebaseConfig;
  } catch (err) {
    console.error('[Firebase] Error fetching config:', err);
    return null;
  }
};

/**
 * Initialize Firebase with config from edge function
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
      configLoaded = true;
      configValid = false;
      return false;
    }
    
    console.log('[Firebase] Initializing app...', isNativeApp ? '(Native APK)' : '(Web)');
    firebaseApp = initializeApp(config);
    
    // Initialize auth with appropriate persistence for the platform
    if (isNativeApp) {
      // For native apps, use indexedDB persistence (works better on Android WebView)
      try {
        firebaseAuth = initializeAuth(firebaseApp, {
          persistence: [indexedDBLocalPersistence, browserLocalPersistence]
        });
        console.log('[Firebase] Auth initialized with indexedDB persistence (Native)');
      } catch (e) {
        // Fallback if initializeAuth fails
        firebaseAuth = getAuth(firebaseApp);
        console.log('[Firebase] Auth initialized with default persistence (Native fallback)');
      }
    } else {
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
    
    console.log('[Firebase] Initialized successfully with multi-auth support');
    console.log('[Firebase] Project ID:', config.projectId);
    console.log('[Firebase] Auth Domain:', config.authDomain);
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
 * Check if running in native app (Capacitor)
 */
export const isRunningInNativeApp = (): boolean => {
  return isNativeApp;
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
