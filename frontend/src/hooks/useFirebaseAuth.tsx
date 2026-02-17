import { useState, useEffect, useCallback, useRef } from "react";
import {
  initializeFirebase,
  getFirebaseAuth,
  getGoogleProvider,
  isRunningInNativeApp,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOutFn,
  signInWithCredential,
  GoogleAuthProvider,
} from "@/lib/firebase";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

// Store reCAPTCHA globally to guarantee a true singleton per page.
declare global {
  interface Window {
    __fasthaazirRecaptchaVerifier?: any;
    __fasthaazirRecaptchaWidgetId?: number;
    __recaptchaInitAttempts?: number;
  }
}

export interface FirebaseAuthState {
  user: any;
  loading: boolean;
  isConfigured: boolean;
  configLoading: boolean;
}

export interface OTPState {
  sending: boolean;
  verifying: boolean;
  error: string | null;
  canResend: boolean;
  resendCooldown: number;
}

export interface EmailAuthState {
  loading: boolean;
  error: string | null;
}

/**
 * Hook to manage Firebase Multi-Authentication (Phone OTP, Email/Password, Google)
 * Optimized for both Web and Android APK environments
 */
export const useFirebaseAuth = () => {
  const [authState, setAuthState] = useState<FirebaseAuthState>({
    user: null,
    loading: true,
    isConfigured: false,
    configLoading: true,
  });

  const [otpState, setOtpState] = useState<OTPState>({
    sending: false,
    verifying: false,
    error: null,
    canResend: true,
    resendCooldown: 0,
  });

  const [emailAuthState, setEmailAuthState] = useState<EmailAuthState>({
    loading: false,
    error: null,
  });

  const confirmationResultRef = useRef<any>(null);
  const cooldownIntervalRef = useRef<number | null>(null);
  const recaptchaRenderingRef = useRef(false);
  const recaptchaContainerIdRef = useRef<string | null>(null);
  const initAttemptedRef = useRef(false);

  // Initialize Firebase and listen for auth state changes
  useEffect(() => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      const platform = isRunningInNativeApp() ? 'Android APK' : 'Web';
      console.log(`[useFirebaseAuth] Initializing Firebase (${platform})...`);
      console.log("[useFirebaseAuth] Domain:", window.location.hostname);
      console.log("[useFirebaseAuth] Protocol:", window.location.protocol);

      const success = await initializeFirebase();
      const auth = getFirebaseAuth();

      if (success && auth) {
        console.log(`[useFirebaseAuth] Firebase ready ✓ (${platform})`);
        unsubscribe = onAuthStateChanged(auth, (user: any) => {
          console.log("[useFirebaseAuth] Auth state changed:", user?.email || user?.phoneNumber || "null");
          setAuthState({
            user,
            loading: false,
            isConfigured: true,
            configLoading: false,
          });
        });
      } else {
        console.error("[useFirebaseAuth] Firebase initialization failed");
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          isConfigured: false,
          configLoading: false,
        }));
      }
    };

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Cleanup cooldown interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  const startResendCooldown = useCallback(() => {
    setOtpState((prev) => ({ ...prev, canResend: false, resendCooldown: 60 }));

    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
    }

    cooldownIntervalRef.current = window.setInterval(() => {
      setOtpState((prev) => {
        if (prev.resendCooldown <= 1) {
          if (cooldownIntervalRef.current) {
            clearInterval(cooldownIntervalRef.current);
          }
          return { ...prev, canResend: true, resendCooldown: 0 };
        }
        return { ...prev, resendCooldown: prev.resendCooldown - 1 };
      });
    }, 1000);
  }, []);

  /**
   * Initialize SINGLETON invisible reCAPTCHA verifier
   * Enhanced for Android WebView compatibility
   */
  /*
   * Initialize SINGLETON invisible reCAPTCHA verifier
   * Enhanced for Android WebView compatibility and localhost debugging
   */
  const initRecaptcha = useCallback(async (containerId: string): Promise<boolean> => {
    const auth = getFirebaseAuth();
    const isNative = isRunningInNativeApp();

    if (!auth) {
      console.error("[useFirebaseAuth] Cannot init reCAPTCHA - no auth instance");
      return false;
    }

    recaptchaContainerIdRef.current = containerId;
    window.__recaptchaInitAttempts = (window.__recaptchaInitAttempts || 0) + 1;

    // Wait for DOM to be ready (critical for React rendering timing)
    let container = document.getElementById(containerId);
    if (!container) {
      console.warn(`[useFirebaseAuth] reCAPTCHA container '${containerId}' not found. Waiting...`);
      await new Promise(r => setTimeout(r, 500));
      container = document.getElementById(containerId);

      if (!container) {
        console.error(`[useFirebaseAuth] reCAPTCHA container '${containerId}' STILL missing after wait.`);
        // Try fallback
        container = document.getElementById('recaptcha-container');
        if (container) {
          console.log("[useFirebaseAuth] Found fallback container 'recaptcha-container'");
          containerId = 'recaptcha-container';
        } else {
          // Absolute last resort: create it with null checks
          console.warn("[useFirebaseAuth] Creating fallback container in body");
          try {
            const div = document.createElement('div');
            if (div) {
              div.id = 'recaptcha-container';
              // Check if document.body exists before accessing
              if (document.body) {
                div.style.position = 'fixed';
                div.style.top = '-1000px';
                div.style.left = '-1000px';
                div.style.width = '1px';
                div.style.height = '1px';
                div.style.overflow = 'hidden';
                document.body.appendChild(div);
                container = div;
                containerId = 'recaptcha-container';
                console.log("[useFirebaseAuth] Created fallback container successfully");
              } else {
                console.error("[useFirebaseAuth] document.body is null, cannot create container");
                return false;
              }
            }
          } catch (createErr) {
            console.error("[useFirebaseAuth] Failed to create fallback container:", createErr);
            return false;
          }
        }
      }
    }

    // Singleton check
    if (window.__fasthaazirRecaptchaVerifier) {
      console.log("[useFirebaseAuth] reCAPTCHA already initialized (singleton) ✓");
      // Verify it's still valid
      try {
        if (!window.__fasthaazirRecaptchaWidgetId && window.__fasthaazirRecaptchaVerifier.render) {
          await window.__fasthaazirRecaptchaVerifier.render();
        }
        return true;
      } catch (e: any) {
        console.warn("[useFirebaseAuth] Existing reCAPTCHA seems stale or broken, re-initializing...", e);
        try {
          // Attempt to clear, but don't crash if it fails
          if (window.__fasthaazirRecaptchaVerifier.clear) {
            window.__fasthaazirRecaptchaVerifier.clear();
          }
        } catch (clearErr) {
          console.log("[useFirebaseAuth] Failed to clear stale verifier (ignoring):", clearErr);
        }
        window.__fasthaazirRecaptchaVerifier = undefined;
        window.__fasthaazirRecaptchaWidgetId = undefined;
      }
    }

    if (recaptchaRenderingRef.current) {
      console.log("[useFirebaseAuth] reCAPTCHA currently rendering, skipping...");
      return false;
    }

    try {
      recaptchaRenderingRef.current = true;
      console.log(`[useFirebaseAuth] Creating invisible reCAPTCHA (${isNative ? 'Android' : 'Web'})...`);

      // BYPASS for native Android testing (without Play Store)
      // Firebase will automatically fall back to silent verification
      if (isNative) {
        console.log('[useFirebaseAuth] ⚠️ TESTING MODE: Skipping reCAPTCHA on native Android');
        console.log('[useFirebaseAuth] Firebase will use automatic verification fallback');

        // Create a dummy verifier that won't actually render
        const verifier = new RecaptchaVerifier(auth, containerId, {
          size: "invisible",
          callback: () => console.log('[useFirebaseAuth] reCAPTCHA callback (bypassed)'),
        });

        window.__fasthaazirRecaptchaVerifier = verifier;
        recaptchaRenderingRef.current = false;

        console.log('[useFirebaseAuth] ✓ reCAPTCHA bypass enabled for testing');
        return true;
      }

      // safely clear container (Web only)
      if (container && container.childNodes.length > 0) {
        try {
          container.innerHTML = '';
        } catch (e) {
          console.warn("Failed to clear container innerHTML", e);
        }
      }

      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: "invisible",
        callback: (response: any) => {
          console.log("[useFirebaseAuth] reCAPTCHA verified ✓ Token:", response ? "Received" : "None");
        },
        "expired-callback": () => {
          console.warn("[useFirebaseAuth] reCAPTCHA expired");
        },
        "error-callback": (err: any) => {
          console.error("[useFirebaseAuth] reCAPTCHA error-callback:", err);
          // On mobile, this often happens but things still work via native fallback
          if (!isNative) {
            setOtpState(prev => ({ ...prev, error: "Security check failed. Please refresh." }));
          }
        },
      });

      window.__fasthaazirRecaptchaVerifier = verifier;

      // Render it explicitly
      console.log("[useFirebaseAuth] Rendering reCAPTCHA...");
      const widgetId = await verifier.render();
      window.__fasthaazirRecaptchaWidgetId = widgetId;
      console.log("[useFirebaseAuth] reCAPTCHA rendered successfully. Widget ID:", widgetId);

      return true;

    } catch (error: any) {
      console.error("[useFirebaseAuth] reCAPTCHA init FATAL error:", error);
      window.__fasthaazirRecaptchaVerifier = undefined;
      window.__fasthaazirRecaptchaWidgetId = undefined;

      // On Android, be lenient - native verification might still work!
      if (isNative) {
        console.log("[useFirebaseAuth] Android: Ignoring reCAPTCHA error to allow fallback flow");
        return true;
      }

      setOtpState((prev) => ({
        ...prev,
        error: error?.message || "Security check initialization failed.",
      }));
      return false;
    } finally {
      recaptchaRenderingRef.current = false;
    }
  }, []);

  const isRecaptchaReady = useCallback((): boolean => {
    const containerId = recaptchaContainerIdRef.current;
    const hasContainer = !!(containerId && document.getElementById(containerId));
    const hasVerifier = !!window.__fasthaazirRecaptchaVerifier;
    const isNative = isRunningInNativeApp();

    // On Android, be more lenient - allow OTP attempt even if verifier seems missing
    if (isNative && hasContainer) {
      return true;
    }

    return hasVerifier && hasContainer;
  }, []);

  /**
   * Send OTP to phone number (E.164 format)
   */
  const sendOTP = useCallback(
    async (phoneNumber: string): Promise<boolean> => {
      const auth = getFirebaseAuth();

      if (!auth) {
        setOtpState((prev) => ({
          ...prev,
          error: "Authentication not ready. Please refresh and try again.",
        }));
        return false;
      }

      if (otpState.sending) return false;

      if (!window.__fasthaazirRecaptchaVerifier) {
        setOtpState((prev) => ({
          ...prev,
          error: "Security check is still loading. Please wait a moment and try again.",
        }));
        return false;
      }

      if (!otpState.canResend) {
        setOtpState((prev) => ({
          ...prev,
          error: `Please wait ${otpState.resendCooldown} seconds before requesting another OTP.`,
        }));
        return false;
      }

      setOtpState((prev) => ({ ...prev, sending: true, error: null }));

      try {
        console.log("[useFirebaseAuth] Sending OTP to:", phoneNumber);

        const confirmationResult = await signInWithPhoneNumber(
          auth,
          phoneNumber,
          window.__fasthaazirRecaptchaVerifier
        );

        confirmationResultRef.current = confirmationResult;
        startResendCooldown();

        setOtpState((prev) => ({ ...prev, sending: false }));
        console.log("[useFirebaseAuth] OTP sent successfully ✓");
        return true;
      } catch (error: any) {
        console.error("[useFirebaseAuth] Send OTP error:", error);
        console.error("[useFirebaseAuth] Error code:", error?.code);
        console.error("[useFirebaseAuth] Error message:", error?.message);
        confirmationResultRef.current = null;

        // Comprehensive error mapping for phone auth
        let errorMessage = "Failed to send OTP.";
        const errorCode = error?.code || '';

        if (errorCode === "auth/too-many-requests") {
          errorMessage = "Too many attempts. Please wait a few minutes and try again.";
        } else if (errorCode === "auth/quota-exceeded") {
          errorMessage = "SMS quota exceeded. Please try again tomorrow.";
        } else if (errorCode === "auth/captcha-check-failed") {
          errorMessage = "Security check failed. Please refresh the page.";
        } else if (errorCode === "auth/invalid-app-credential") {
          // CRITICAL: This usually means SHA fingerprints are missing in Firebase Console
          errorMessage = isRunningInNativeApp()
            ? "App verification failed. Please update the app or contact support."
            : "Security verification failed. Please refresh and try again.";
          console.error("[useFirebaseAuth] CRITICAL: invalid-app-credential - Check Firebase Console SHA fingerprints!");
        } else if (errorCode === "auth/missing-app-credential") {
          errorMessage = "App credentials missing. Please restart the app.";
        } else if (errorCode === "auth/invalid-phone-number") {
          errorMessage = "Invalid phone number. Please enter a valid Pakistani mobile.";
        } else if (errorCode === "auth/network-request-failed") {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (errorCode === "auth/operation-not-allowed") {
          errorMessage = "Phone authentication is not enabled. Contact support.";
        } else if (error?.message) {
          errorMessage = error.message;
        }

        setOtpState((prev) => ({
          ...prev,
          sending: false,
          error: errorMessage,
        }));

        return false;
      }
    },
    [otpState.sending, otpState.canResend, otpState.resendCooldown, startResendCooldown]
  );

  /**
   * Verify OTP code
   */
  const verifyOTP = useCallback(async (code: string): Promise<any> => {
    if (!confirmationResultRef.current) {
      setOtpState((prev) => ({
        ...prev,
        error: "No OTP request found. Please request a new OTP.",
      }));
      return null;
    }

    setOtpState((prev) => ({ ...prev, verifying: true, error: null }));

    try {
      console.log("[useFirebaseAuth] Verifying OTP...");
      const result = await confirmationResultRef.current.confirm(code);
      setOtpState((prev) => ({ ...prev, verifying: false }));
      console.log("[useFirebaseAuth] OTP verified successfully ✓");
      return result.user;
    } catch (error: any) {
      console.error("[useFirebaseAuth] Verify OTP error:", error);
      let errorMessage = "Verification failed. Please try again.";
      if (error?.code === "auth/invalid-verification-code") {
        errorMessage = "Invalid OTP code. Please check and try again.";
      } else if (error?.code === "auth/code-expired") {
        errorMessage = "OTP has expired. Please request a new one.";
      }

      setOtpState((prev) => ({
        ...prev,
        verifying: false,
        error: errorMessage,
      }));
      return null;
    }
  }, []);

  /**
   * Sign in with Email and Password
   */
  const signInWithEmail = useCallback(async (email: string, password: string): Promise<any> => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setEmailAuthState({ loading: false, error: "Authentication not ready." });
      return null;
    }

    setEmailAuthState({ loading: true, error: null });

    try {
      console.log("[useFirebaseAuth] Signing in with email:", email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      setEmailAuthState({ loading: false, error: null });
      console.log("[useFirebaseAuth] Email sign-in successful ✓");
      return result.user;
    } catch (error: any) {
      console.error("[useFirebaseAuth] Email sign-in error:", error);
      let errorMessage = "Login failed. Please try again.";
      if (error?.code === "auth/invalid-credential" || error?.code === "auth/wrong-password") {
        errorMessage = "Invalid email or password.";
      } else if (error?.code === "auth/user-not-found") {
        errorMessage = "No account found with this email.";
      } else if (error?.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Please try again later.";
      }

      setEmailAuthState({ loading: false, error: errorMessage });
      return null;
    }
  }, []);

  /**
   * Create account with Email and Password
   */
  const signUpWithEmail = useCallback(async (email: string, password: string): Promise<any> => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setEmailAuthState({ loading: false, error: "Authentication not ready." });
      return null;
    }

    setEmailAuthState({ loading: true, error: null });

    try {
      console.log("[useFirebaseAuth] Creating account with email:", email);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      setEmailAuthState({ loading: false, error: null });
      console.log("[useFirebaseAuth] Email sign-up successful ✓");
      return result.user;
    } catch (error: any) {
      console.error("[useFirebaseAuth] Email sign-up error:", error);
      let errorMessage = "Sign up failed. Please try again.";
      if (error?.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Try logging in.";
      } else if (error?.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Use at least 6 characters.";
      } else if (error?.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      }

      setEmailAuthState({ loading: false, error: errorMessage });
      return null;
    }
  }, []);

  /**
   * Send password reset email
   */
  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setEmailAuthState({ loading: false, error: "Authentication not ready." });
      return false;
    }

    setEmailAuthState({ loading: true, error: null });

    try {
      console.log("[useFirebaseAuth] Sending password reset email to:", email);
      await sendPasswordResetEmail(auth, email);
      setEmailAuthState({ loading: false, error: null });
      console.log("[useFirebaseAuth] Password reset email sent ✓");
      return true;
    } catch (error: any) {
      console.error("[useFirebaseAuth] Password reset error:", error);
      let errorMessage = "Failed to send reset email. Please try again.";
      if (error?.code === "auth/user-not-found") {
        errorMessage = "No account found with this email.";
      }

      setEmailAuthState({ loading: false, error: errorMessage });
      return false;
    }
  }, []);

  /**
   * Sign in with Google
   */
  const signInWithGoogle = useCallback(async (): Promise<any> => {
    const auth = getFirebaseAuth();
    const provider = getGoogleProvider();
    const isNative = isRunningInNativeApp();

    if (!auth || !provider) {
      setEmailAuthState({ loading: false, error: "Google sign-in not ready." });
      return null;
    }

    setEmailAuthState({ loading: true, error: null });

    try {
      console.log(`[useFirebaseAuth] Starting Google sign-in (${isNative ? 'Native' : 'Web'})...`);

      let user;

      if (isNative) {
        // Native Google Sign-In (Android/iOS)
        // This uses the native Google Auth SDK via the plugin, bypassing WebView restrictions
        try {
          console.log("[useFirebaseAuth] Initializing Native GoogleAuth...");
          await GoogleAuth.initialize();
        } catch (e) {
          console.log("[useFirebaseAuth] GoogleAuth init warning (might be already init):", e);
        }

        const googleUser = await GoogleAuth.signIn();
        console.log("[useFirebaseAuth] Native sign-in success, getting credential...");

        // Create Firebase credential from the native ID token
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        const result = await signInWithCredential(auth, credential);
        user = result.user;

      } else {
        // Web Google Sign-In (Popup)
        const result = await signInWithPopup(auth, provider);
        user = result.user;
      }

      setEmailAuthState({ loading: false, error: null });
      console.log("[useFirebaseAuth] Google sign-in successful ✓");
      return user;

    } catch (error: any) {
      console.error("[useFirebaseAuth] Google sign-in error:", error);
      let errorMessage = "Google sign-in failed. Please try again.";

      if (error?.code === "auth/popup-closed-by-user" || error?.message?.includes("canceled")) {
        errorMessage = "Sign-in cancelled.";
      } else if (error?.code === "auth/popup-blocked") {
        errorMessage = "Pop-up blocked. Please allow pop-ups for this site.";
      } else if (error?.error === "popup_closed_by_user") { // Plugin specific error
        errorMessage = "Sign-in cancelled.";
      }

      setEmailAuthState({ loading: false, error: errorMessage });
      return null;
    }
  }, []);

  /**
   * Sign out from Firebase
   */
  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;

    try {
      await firebaseSignOutFn(auth);
      confirmationResultRef.current = null;
      console.log("[useFirebaseAuth] Signed out successfully");
    } catch (error) {
      console.error("[useFirebaseAuth] Sign out error:", error);
    }
  }, []);

  const clearError = useCallback(() => {
    setOtpState((prev) => ({ ...prev, error: null }));
    setEmailAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  const resetOTPFlow = useCallback(() => {
    confirmationResultRef.current = null;
    setOtpState({
      sending: false,
      verifying: false,
      error: null,
      canResend: true,
      resendCooldown: 0,
    });
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
    }
  }, []);

  return {
    // Auth state
    user: authState.user,
    loading: authState.loading,
    isConfigured: authState.isConfigured,
    configLoading: authState.configLoading,

    // reCAPTCHA
    isRecaptchaReady,

    // OTP state & methods
    otpState,
    initRecaptcha,
    sendOTP,
    verifyOTP,

    // Email/Password state & methods
    emailAuthState,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,

    // Google auth
    signInWithGoogle,

    // Common methods
    signOut,
    clearError,
    resetOTPFlow,
  };
};
