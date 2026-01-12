// Firebase SDK - Multi-auth support (Phone OTP, Email/Password, Google)
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { supabase } from '@/integrations/supabase/client';

// Use 'any' for Firebase instances to avoid complex type inference
let firebaseApp: any = null;
let firebaseAuth: any = null;
let googleProvider: any = null;
let configLoaded = false;
let configValid = false;

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
    const { data, error } = await supabase.functions.invoke('get-firebase-config');
    
    if (error) {
      console.error('[Firebase] Failed to fetch config:', error);
      return null;
    }
    
    if (!data?.success || !data?.isValid) {
      console.error('[Firebase] Config not valid:', data);
      return null;
    }
    
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
    const config = await fetchFirebaseConfig();
    
    if (!config) {
      configLoaded = true;
      configValid = false;
      return false;
    }
    
    firebaseApp = initializeApp(config);
    firebaseAuth = getAuth(firebaseApp);
    firebaseAuth.languageCode = 'en';
    
    // Initialize Google Auth Provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    configLoaded = true;
    configValid = true;
    
    console.log('[Firebase] Initialized successfully with multi-auth support');
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

// Re-export Firebase auth functions
export { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged, 
  signOut 
};
