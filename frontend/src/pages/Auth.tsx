import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Phone, Mail, ArrowLeft, Shield, Loader2, AlertCircle, 
  RefreshCw, LogOut, User, CheckCircle, Home, Eye, EyeOff 
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizePhoneNumber, normalizePhoneDigits, isValidPakistaniMobile } from "@/lib/phoneUtils";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import LanguageToggle from "@/components/LanguageToggle";
import fastHaazirLogo from "@/assets/fast-haazir-logo.png";

type AuthMethod = "select" | "phone" | "email" | "otp";

/**
 * Clear all cached role-related queries
 */
const clearRoleCache = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.removeQueries({ queryKey: ["user-role"] });
  queryClient.removeQueries({ queryKey: ["is-admin"] });
  queryClient.removeQueries({ queryKey: ["customer-profile"] });
  queryClient.removeQueries({ queryKey: ["rider-profile"] });
  queryClient.removeQueries({ queryKey: ["orders"] });
  queryClient.removeQueries({ queryKey: ["customer-addresses"] });
  // Removed: my-business query (business role removed)
};

/**
 * Clear all auth-related storage
 */
const clearAuthStorage = () => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('supabase') || 
      key.includes('firebase') || 
      key.includes('auth') ||
      key.includes('sb-')
    )) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  sessionStorage.clear();
};

/**
 * Sync Firebase user with Supabase using phone
 */
const syncWithSupabaseByPhone = async (
  firebasePhone: string,
  navigate: ReturnType<typeof useNavigate>,
  queryClient: ReturnType<typeof useQueryClient>,
  firebaseSignOut: () => Promise<void>
): Promise<{ success: boolean; error?: string }> => {
  const e164Phone = normalizePhoneNumber(firebasePhone);
  const digitsPhone = normalizePhoneDigits(firebasePhone);
  
  console.log("[Auth] Syncing by phone:", digitsPhone);
  clearRoleCache(queryClient);

  try {
    const supabaseEmail = `user_${digitsPhone}@fasthaazir.app`;
    const supabasePassword = `firebase_${digitsPhone}_auth`;
    
    let { data, error } = await supabase.auth.signInWithPassword({
      email: supabaseEmail,
      password: supabasePassword,
    });
    
    if (error && error.message.includes("Invalid login credentials")) {
      console.log("[Auth] Creating new Supabase account...");
      const signUpResult = await supabase.auth.signUp({
        email: supabaseEmail,
        password: supabasePassword,
        options: { emailRedirectTo: `${window.location.origin}/` }
      });
      data = signUpResult.data;
      error = signUpResult.error;
      
      if (!error && data?.user) {
        const signInResult = await supabase.auth.signInWithPassword({
          email: supabaseEmail,
          password: supabasePassword,
        });
        data = signInResult.data;
        error = signInResult.error;
      }
    }

    if (error) {
      console.error("[Auth] Supabase auth error:", error);
      return { success: false, error: "Account setup failed. Please try again." };
    }

    if (!data?.session) {
      return { success: false, error: "Session not ready. Please try again." };
    }

    return await checkRoleByPhone(digitsPhone, navigate, queryClient, data.session, firebaseSignOut);
  } catch (err) {
    console.error("[Auth] Sync error:", err);
    return { success: false, error: "Failed to complete login. Please try again." };
  }
};

/**
 * Sync Firebase user with Supabase using email
 */
const syncWithSupabaseByEmail = async (
  email: string,
  navigate: ReturnType<typeof useNavigate>,
  queryClient: ReturnType<typeof useQueryClient>,
  firebaseSignOut: () => Promise<void>
): Promise<{ success: boolean; error?: string }> => {
  console.log("[Auth] Syncing by email:", email);
  clearRoleCache(queryClient);

  try {
    const supabaseEmail = `firebase_${email.replace(/[^a-zA-Z0-9]/g, '_')}@fasthaazir.app`;
    const supabasePassword = `firebase_${email}_auth_v2`;
    
    let { data, error } = await supabase.auth.signInWithPassword({
      email: supabaseEmail,
      password: supabasePassword,
    });
    
    if (error && error.message.includes("Invalid login credentials")) {
      console.log("[Auth] Creating new Supabase account for email user...");
      const signUpResult = await supabase.auth.signUp({
        email: supabaseEmail,
        password: supabasePassword,
        options: { emailRedirectTo: `${window.location.origin}/` }
      });
      data = signUpResult.data;
      error = signUpResult.error;
      
      if (!error && data?.user) {
        const signInResult = await supabase.auth.signInWithPassword({
          email: supabaseEmail,
          password: supabasePassword,
        });
        data = signInResult.data;
        error = signInResult.error;
      }
    }

    if (error) {
      console.error("[Auth] Supabase auth error:", error);
      return { success: false, error: "Account setup failed. Please try again." };
    }

    if (!data?.session) {
      return { success: false, error: "Session not ready. Please try again." };
    }

    return await checkRoleByEmail(email, navigate, queryClient, data.session, firebaseSignOut);
  } catch (err) {
    console.error("[Auth] Sync error:", err);
    return { success: false, error: "Failed to complete login. Please try again." };
  }
};

/**
 * Check role by phone and redirect
 */
const checkRoleByPhone = async (
  phoneDigits: string,
  navigate: ReturnType<typeof useNavigate>,
  queryClient: ReturnType<typeof useQueryClient>,
  session: Session,
  firebaseSignOut: () => Promise<void>
): Promise<{ success: boolean; error?: string }> => {
  console.log("[Auth] Checking role by phone:", phoneDigits);

  let data: { role: string; is_blocked: boolean }[] | null = null;
  let error: Error | null = null;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await supabase.rpc("resolve_role_by_phone", { _phone: phoneDigits });
    data = result.data;
    error = result.error;
    
    if (!error && data && data.length > 0) break;
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (error?.message?.includes('phone_already_claimed')) {
    await supabase.auth.signOut();
    await firebaseSignOut();
    clearAuthStorage();
    return { 
      success: false, 
      error: "This phone number is linked to a different account. Contact support." 
    };
  }

  const result = data && data.length > 0 ? data[0] : null;
  const role = result?.role || "customer";
  const isBlocked = !!result?.is_blocked;

  if (isBlocked) {
    await supabase.auth.signOut();
    await firebaseSignOut();
    clearAuthStorage();
    return { success: false, error: "Your account is disabled. Contact admin." };
  }

  return redirectByRole(role, navigate, queryClient);
};

/**
 * Check role by email and redirect
 */
const checkRoleByEmail = async (
  email: string,
  navigate: ReturnType<typeof useNavigate>,
  queryClient: ReturnType<typeof useQueryClient>,
  session: Session,
  firebaseSignOut: () => Promise<void>
): Promise<{ success: boolean; error?: string }> => {
  console.log("[Auth] Checking role by email:", email);

  let data: { role: string; is_blocked: boolean }[] | null = null;
  let error: Error | null = null;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await supabase.rpc("resolve_role_by_email", { _email: email });
    data = result.data;
    error = result.error;
    
    if (!error && data && data.length > 0) break;
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (error?.message?.includes('email_already_claimed')) {
    await supabase.auth.signOut();
    await firebaseSignOut();
    clearAuthStorage();
    return { 
      success: false, 
      error: "This email is linked to a different account. Contact support." 
    };
  }

  const result = data && data.length > 0 ? data[0] : null;
  const role = result?.role || "customer";
  const isBlocked = !!result?.is_blocked;

  if (isBlocked) {
    await supabase.auth.signOut();
    await firebaseSignOut();
    clearAuthStorage();
    return { success: false, error: "Your account is disabled. Contact admin." };
  }

  return redirectByRole(role, navigate, queryClient);
};

/**
 * Redirect based on role (admin | rider | customer only)
 */
const redirectByRole = (
  role: string,
  navigate: ReturnType<typeof useNavigate>,
  queryClient: ReturnType<typeof useQueryClient>
): { success: boolean } => {
  queryClient.invalidateQueries({ queryKey: ["user-role"] });
  queryClient.invalidateQueries({ queryKey: ["is-admin"] });

  const redirectPath = (() => {
    switch (role) {
      case "admin": return "/admin";
      case "rider": return "/rider";
      // Removed: business role (now admin-controlled)
      default: return "/"; // customer
    }
  })();
  
  const welcomeMessage = (() => {
    switch (role) {
      case "admin": return "Welcome Admin!";
      case "rider": return "Welcome Rider!";
      // Removed: business welcome message
      default: return "Welcome to Fast Haazir!";
    }
  })();
  
  console.log("[Auth] Redirecting to:", redirectPath);
  toast.success(welcomeMessage);
  navigate(redirectPath, { replace: true });
  return { success: true };
};

// ==================== MAIN COMPONENT ====================

const Auth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<AuthMethod>("select");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const {
    user: firebaseUser,
    loading: authLoading,
    isConfigured,
    configLoading,
    otpState,
    emailAuthState,
    initRecaptcha,
    isRecaptchaReady,
    sendOTP,
    verifyOTP,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    resetPassword,
    signOut: firebaseSignOut,
    clearError,
    resetOTPFlow,
  } = useFirebaseAuth();

  const formatPhoneForDisplay = (phoneNumber: string | null) => {
    if (!phoneNumber) return "";
    const cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.length === 12 && cleaned.startsWith("92")) {
      return `+92 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }
    return phoneNumber;
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      clearRoleCache(queryClient);
      await firebaseSignOut();
      await supabase.auth.signOut();
      clearAuthStorage();
      toast.success("Logged out successfully");
      setStep("select");
      setPhone("");
      setOtp("");
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("[Auth] Logout error:", error);
      toast.error("Failed to logout");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Initialize reCAPTCHA
  useEffect(() => {
    if (!isConfigured || recaptchaReady) return;

    const initCaptcha = async () => {
      const success = await initRecaptcha("recaptcha-container");
      setRecaptchaReady(success);
    };

    const timer = window.setTimeout(initCaptcha, 0);
    return () => window.clearTimeout(timer);
  }, [isConfigured, recaptchaReady, initRecaptcha]);

  // Sync Firebase user with Supabase
  useEffect(() => {
    if (firebaseUser && !authLoading && !isSyncing) {
      const phoneNumber = firebaseUser.phoneNumber;
      const userEmail = firebaseUser.email;
      
      if (phoneNumber || userEmail) {
        console.log("[Auth] Firebase user detected, starting sync...");
        setIsSyncing(true);
        
        const timeoutId = setTimeout(async () => {
          console.error("[Auth] Sync timeout - cleaning up");
          toast.error("Account setup timed out. Please try again.");
          await firebaseSignOut();
          await supabase.auth.signOut();
          clearAuthStorage();
          setIsSyncing(false);
        }, 15000);
        
        const syncPromise = phoneNumber 
          ? syncWithSupabaseByPhone(phoneNumber, navigate, queryClient, firebaseSignOut)
          : syncWithSupabaseByEmail(userEmail!, navigate, queryClient, firebaseSignOut);
        
        syncPromise
          .then((result) => {
            clearTimeout(timeoutId);
            if (!result.success && result.error) {
              toast.error(result.error);
            }
          })
          .finally(() => setIsSyncing(false));
      }
    }
  }, [firebaseUser, authLoading, navigate, queryClient, isSyncing, firebaseSignOut]);

  const formatPhoneInput = (value: string) => value.replace(/\D/g, "");

  const getFullPhoneNumber = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("92")) return `+${digits}`;
    if (digits.startsWith("0")) return `+92${digits.slice(1)}`;
    return `+92${digits}`;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const fullPhone = getFullPhoneNumber();
    
    if (!isValidPakistaniMobile(fullPhone)) {
      toast.error("Please enter a valid Pakistani mobile number");
      return;
    }

    if (!isConfigured || !recaptchaReady || !isRecaptchaReady()) {
      toast.error("Security check is still loading. Please wait.");
      return;
    }

    const success = await sendOTP(fullPhone);
    if (success) {
      toast.success("OTP sent to your phone!");
      setStep("otp");
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    const user = await verifyOTP(otp);
    if (user) {
      toast.success("Phone verified successfully!");
    }
  };

  const handleResendOTP = async () => {
    if (!otpState.canResend) return;
    clearError();
    const fullPhone = getFullPhoneNumber();
    const success = await sendOTP(fullPhone);
    if (success) toast.success("OTP resent!");
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    if (isSignUp) {
      const user = await signUpWithEmail(email, password);
      if (user) toast.success("Account created!");
    } else {
      const user = await signInWithEmail(email, password);
      if (user) toast.success("Signed in!");
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    const user = await signInWithGoogle();
    if (user) toast.success("Signed in with Google!");
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email first");
      return;
    }
    const success = await resetPassword(email);
    if (success) toast.success("Password reset email sent!");
  };

  const handleBack = () => {
    if (step === "otp") {
      setStep("phone");
      setOtp("");
      resetOTPFlow();
    } else {
      setStep("select");
      setEmail("");
      setPassword("");
      clearError();
    }
  };

  // Loading state
  if (authLoading || configLoading || isSyncing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {isSyncing && <p className="text-sm text-muted-foreground">{t('auth.settingUpAccount')}</p>}
      </div>
    );
  }

  // Config error
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t('errors.configError')}</h2>
        <p className="text-muted-foreground text-center">
          {t('errors.firebaseNotConfigured')}
        </p>
      </div>
    );
  }

  // Already logged in
  if (firebaseUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="gradient-primary p-6 pb-16 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">{t('auth.welcomeBack')}</h1>
            <p className="text-white/80 text-sm mt-1">{t('auth.youAreLoggedIn')}</p>
          </motion.div>
        </div>

        <div className="flex-1 -mt-8 relative z-20">
          <div className="bg-card rounded-t-3xl min-h-full p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-muted rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">{t('auth.loggedInAs')}</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    {firebaseUser.phoneNumber ? <Phone className="w-6 h-6 text-primary" /> : <Mail className="w-6 h-6 text-primary" />}
                  </div>
                  <span className="text-lg font-semibold text-foreground ltr-keep">
                    {firebaseUser.phoneNumber ? formatPhoneForDisplay(firebaseUser.phoneNumber) : firebaseUser.email}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Button onClick={() => navigate("/")} className="w-full h-14 text-base font-medium">
                  <Home className="w-5 h-5 mr-2" />
                  {t('auth.goToHome')}
                </Button>
                <Button variant="outline" onClick={() => navigate("/profile")} className="w-full h-14 text-base font-medium">
                  <User className="w-5 h-5 mr-2" />
                  {t('profile.profile')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full h-14 text-base font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {isLoggingOut ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <LogOut className="w-5 h-5 mr-2" />}
                  {isLoggingOut ? t('auth.loggingOut') : t('auth.logout')}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== AUTH SCREENS ====================
  
  const error = otpState.error || emailAuthState.error;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="gradient-primary p-6 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-white/10 blur-xl" />
        </div>
        
        <div className="relative z-10">
          {step !== "select" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-white hover:bg-white/20 mb-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            {step === "select" ? (
              <img 
                src={fastHaazirLogo} 
                alt="Fast Haazir" 
                className="w-32 h-32 mx-auto mb-4 object-contain"
              />
            ) : (
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                {step === "phone" || step === "otp" ? (
                  <Phone className="w-10 h-10 text-white" />
                ) : step === "email" ? (
                  <Mail className="w-10 h-10 text-white" />
                ) : (
                  <Shield className="w-10 h-10 text-white" />
                )}
              </div>
            )}
            
            <h1 className="text-2xl font-bold text-white">
              {step === "select" && "Welcome to Fast Haazir"}
              {step === "phone" && "Enter Phone Number"}
              {step === "otp" && "Verify OTP"}
              {step === "email" && (isSignUp ? "Create Account" : "Email Login")}
            </h1>
            <p className="text-white/80 text-sm mt-1">
              {step === "select" && "Choose how you want to continue"}
              {step === "phone" && "We'll send you a one-time code"}
              {step === "otp" && `Enter the 6-digit code sent to ${formatPhoneForDisplay(getFullPhoneNumber())}`}
              {step === "email" && (isSignUp ? "Create a new account with email" : "Sign in with your email")}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 -mt-8 relative z-20">
        <div className="bg-card rounded-t-3xl min-h-full p-6">
          <AnimatePresence mode="wait">
            
            {/* AUTH METHOD SELECTION */}
            {step === "select" && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* Phone OTP - Primary */}
                <Button
                  onClick={() => setStep("phone")}
                  className="w-full h-14 text-base font-medium"
                >
                  <Phone className="w-5 h-5 mr-3" />
                  Continue with Phone
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                {/* Email */}
                <Button
                  variant="outline"
                  onClick={() => setStep("email")}
                  className="w-full h-14 text-base font-medium"
                >
                  <Mail className="w-5 h-5 mr-3" />
                  Continue with Email
                </Button>

                {/* Google */}
                <Button
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={emailAuthState.loading}
                  className="w-full h-14 text-base font-medium"
                >
                  {emailAuthState.loading ? (
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with Google
                </Button>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <p className="text-xs text-center text-muted-foreground pt-4">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </motion.div>
            )}

            {/* PHONE INPUT */}
            {step === "phone" && (
              <motion.form
                key="phone"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSendOTP}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground font-medium">Phone Number</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <span className="text-muted-foreground font-medium">+92</span>
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="3XX XXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                      className="pl-14 h-14 text-lg bg-muted border-0 focus-visible:ring-primary"
                      maxLength={11}
                      required
                    />
                  </div>
                </div>

                {otpState.error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{otpState.error}</span>
                  </motion.div>
                )}

                <Button
                  type="submit"
                  className="w-full h-14 text-base font-medium"
                  disabled={otpState.sending || phone.length < 10 || !recaptchaReady}
                >
                  {otpState.sending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </motion.form>
            )}

            {/* OTP VERIFICATION */}
            {step === "otp" && (
              <motion.form
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOTP}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-foreground font-medium">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-14 text-2xl text-center tracking-[0.5em] font-mono bg-muted border-0 focus-visible:ring-primary"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>

                {otpState.error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{otpState.error}</span>
                  </motion.div>
                )}

                <Button
                  type="submit"
                  className="w-full h-14 text-base font-medium"
                  disabled={otpState.verifying || otp.length !== 6}
                >
                  {otpState.verifying ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Continue"
                  )}
                </Button>

                <div className="text-center">
                  {otpState.canResend ? (
                    <Button type="button" variant="ghost" onClick={handleResendOTP} disabled={otpState.sending}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${otpState.sending ? 'animate-spin' : ''}`} />
                      Resend OTP
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">Resend OTP in {otpState.resendCooldown}s</p>
                  )}
                </div>
              </motion.form>
            )}

            {/* EMAIL LOGIN */}
            {step === "email" && (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleEmailAuth}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 text-lg bg-muted border-0 focus-visible:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 text-lg bg-muted border-0 focus-visible:ring-primary pr-12"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>

                {emailAuthState.error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{emailAuthState.error}</span>
                  </motion.div>
                )}

                <Button
                  type="submit"
                  className="w-full h-14 text-base font-medium"
                  disabled={emailAuthState.loading}
                >
                  {emailAuthState.loading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  {isSignUp ? "Create Account" : "Sign In"}
                </Button>

                <div className="flex flex-col items-center gap-3 pt-2">
                  {!isSignUp && (
                    <Button type="button" variant="link" onClick={handleForgotPassword} className="text-sm">
                      Forgot password?
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm"
                  >
                    {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Auth;
