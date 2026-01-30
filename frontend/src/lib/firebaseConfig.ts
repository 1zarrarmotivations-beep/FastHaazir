/**
 * Firebase Configuration Utilities
 * Provides diagnostic and configuration helpers for Firebase integration
 */

import { Capacitor } from '@capacitor/core';

export interface FirebaseConfigDiagnostic {
  platform: string;
  isNative: boolean;
  hasRecaptcha: boolean;
  domain: string;
  protocol: string;
  userAgent: string;
  recommendations: string[];
}

/**
 * Run diagnostics on Firebase configuration
 * Helps identify issues with phone auth, especially on Android
 */
export const runFirebaseDiagnostics = (): FirebaseConfigDiagnostic => {
  const recommendations: string[] = [];
  
  // Platform detection
  let platform = 'unknown';
  let isNative = false;
  
  try {
    if (Capacitor.isNativePlatform()) {
      platform = Capacitor.getPlatform();
      isNative = true;
    } else {
      platform = 'web';
    }
  } catch {
    platform = 'web';
  }

  // Domain and protocol
  const domain = window.location.hostname;
  const protocol = window.location.protocol;

  // reCAPTCHA check
  const hasRecaptcha = !!(window as any).__fasthaazirRecaptchaVerifier;

  // Generate recommendations based on detected issues
  if (isNative && platform === 'android') {
    recommendations.push(
      '⚠️ Android APK detected. Ensure SHA-1 and SHA-256 fingerprints are added to Firebase Console.',
      '⚠️ Both debug and release keystore fingerprints are required.',
      '⚠️ Run: cd android && ./gradlew signingReport to get fingerprints.',
    );
  }

  if (!hasRecaptcha && platform === 'android') {
    recommendations.push(
      '⚠️ reCAPTCHA not initialized. Android WebView may block reCAPTCHA.',
      '⚠️ The app uses lenient mode to allow OTP attempts despite reCAPTCHA issues.',
    );
  }

  if (domain.includes('localhost')) {
    recommendations.push(
      '⚠️ Running on localhost. Add localhost to Firebase authorized domains.',
    );
  }

  if (protocol !== 'https:' && !domain.includes('localhost')) {
    recommendations.push(
      '⚠️ Running on non-HTTPS. Firebase phone auth requires HTTPS in production.',
    );
  }

  return {
    platform,
    isNative,
    hasRecaptcha,
    domain,
    protocol,
    userAgent: navigator.userAgent,
    recommendations,
  };
};

/**
 * Log Firebase configuration diagnostics to console
 */
export const logFirebaseDiagnostics = (): void => {
  const diag = runFirebaseDiagnostics();
  
  console.log('=== Firebase Configuration Diagnostics ===');
  console.log('Platform:', diag.platform);
  console.log('Is Native App:', diag.isNative);
  console.log('Domain:', diag.domain);
  console.log('Protocol:', diag.protocol);
  console.log('reCAPTCHA Ready:', diag.hasRecaptcha);
  
  if (diag.recommendations.length > 0) {
    console.log('\n--- Recommendations ---');
    diag.recommendations.forEach(r => console.log(r));
  } else {
    console.log('\n✓ No issues detected');
  }
  
  console.log('=========================================');
};

/**
 * Firebase Phone Auth Error Codes and User-Friendly Messages
 */
export const getFirebaseAuthErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    'auth/invalid-app-credential': 
      'App verification failed. This may be due to missing SHA fingerprints in Firebase Console for Android.',
    'auth/invalid-phone-number': 
      'Invalid phone number format. Please enter a valid Pakistani mobile number.',
    'auth/quota-exceeded': 
      'SMS quota exceeded. Please try again tomorrow or contact support.',
    'auth/too-many-requests': 
      'Too many attempts. Please wait a few minutes and try again.',
    'auth/captcha-check-failed': 
      'Security verification failed. Please refresh the page and try again.',
    'auth/missing-app-credential': 
      'App credentials missing. Ensure Firebase is properly configured.',
    'auth/network-request-failed': 
      'Network error. Please check your internet connection.',
    'auth/invalid-verification-code': 
      'Invalid OTP code. Please check the code and try again.',
    'auth/code-expired': 
      'OTP has expired. Please request a new one.',
    'auth/user-disabled': 
      'This account has been disabled. Contact support.',
    'auth/operation-not-allowed': 
      'Phone authentication is not enabled for this app.',
  };

  return errorMessages[errorCode] || `Authentication error: ${errorCode}`;
};

/**
 * Check if Firebase is properly configured for Android
 */
export const checkAndroidFirebaseConfig = (): { isConfigured: boolean; issues: string[] } => {
  const issues: string[] = [];

  try {
    if (!Capacitor.isNativePlatform()) {
      return { isConfigured: true, issues: [] };
    }

    const platform = Capacitor.getPlatform();
    if (platform !== 'android') {
      return { isConfigured: true, issues: [] };
    }

    // Check for common Android configuration issues
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (!userAgent.includes('wv') && !userAgent.includes('webview')) {
      issues.push('WebView not detected. Capacitor may not be properly initialized.');
    }

    // Check if Firebase config was loaded
    if (!(window as any).__firebaseConfigLoaded) {
      issues.push('Firebase configuration not loaded. Check edge function get-firebase-config.');
    }

    return {
      isConfigured: issues.length === 0,
      issues,
    };
  } catch (err) {
    return {
      isConfigured: false,
      issues: ['Error checking Android Firebase configuration'],
    };
  }
};

export default {
  runFirebaseDiagnostics,
  logFirebaseDiagnostics,
  getFirebaseAuthErrorMessage,
  checkAndroidFirebaseConfig,
};
