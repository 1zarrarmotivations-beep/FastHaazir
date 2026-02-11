import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, ArrowLeft, Shield, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useCustomerProfile, useUpsertCustomerProfile } from "@/hooks/useCustomerProfile";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { normalizePhoneNumber, normalizePhoneDigits, isValidPakistaniMobile } from "@/lib/phoneUtils";

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useCustomerProfile();
  const upsertProfile = useUpsertCustomerProfile();

  const [step, setStep] = useState<"phone" | "otp" | "complete">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [recaptchaReady, setRecaptchaReady] = useState(false);

  const {
    isConfigured,
    configLoading,
    otpState,
    initRecaptcha,
    isRecaptchaReady,
    sendOTP,
    verifyOTP,
    clearError,
    resetOTPFlow,
  } = useFirebaseAuth();

  // Check if user already has verified phone
  useEffect(() => {
    if (!authLoading && !profileLoading && profile?.phone_verified && profile?.phone) {
      // Already verified, redirect back
      navigate("/", { replace: true });
    }
  }, [profile, authLoading, profileLoading, navigate]);

  // Initialize reCAPTCHA
  useEffect(() => {
    if (!isConfigured || recaptchaReady) return;

    const initCaptcha = async () => {
      const success = await initRecaptcha("recaptcha-container");
      setRecaptchaReady(success);
    };

    const timer = window.setTimeout(initCaptcha, 100);
    return () => window.clearTimeout(timer);
  }, [isConfigured, recaptchaReady, initRecaptcha]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

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

    const firebaseUser = await verifyOTP(otp);
    if (firebaseUser) {
      // Save phone to customer profile
      const fullPhone = getFullPhoneNumber();
      const digitsPhone = normalizePhoneDigits(fullPhone);

      try {
        await upsertProfile.mutateAsync({
          phone: digitsPhone,
          phone_verified: true,
        });

        setStep("complete");
        toast.success("Phone verified successfully!");

        // Redirect after short delay
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 2000);
      } catch (error) {
        console.error("Failed to save phone:", error);
        toast.error("Failed to save phone number. Please try again.");
      }
    }
  };

  const handleResendOTP = async () => {
    if (!otpState.canResend) return;
    clearError();
    const fullPhone = getFullPhoneNumber();
    const success = await sendOTP(fullPhone);
    if (success) toast.success("OTP resent!");
  };

  const handleBack = () => {
    if (step === "otp") {
      resetOTPFlow();
      setStep("phone");
      setOtp("");
    } else {
      navigate(-1);
    }
  };

  if (authLoading || profileLoading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mobile-container bg-background min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="icon" size="icon-sm" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-foreground">Complete Your Profile</h1>
        </div>
      </header>

      <div className="p-4">
        {/* Info Card */}
        <Card variant="elevated" className="p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold mb-1">Phone Verification Required</h2>
              <p className="text-sm text-muted-foreground">
                A verified phone number is required to place orders and for delivery communication.
              </p>
            </div>
          </div>
        </Card>

        {/* Step: Phone Input */}
        {step === "phone" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-muted rounded-xl border border-border">
                    <span className="text-sm font-medium">🇵🇰 +92</span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="3XX XXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                    maxLength={10}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your Pakistani mobile number
                </p>
              </div>

              {otpState.error && (
                <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                  {otpState.error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={otpState.sending || phone.length < 10 || !recaptchaReady}
              >
                {otpState.sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : !recaptchaReady ? (
                  "Loading security check..."
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Send OTP
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        )}

        {/* Step: OTP Verification */}
        {step === "otp" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to
                </p>
                <p className="font-semibold">+92 {phone}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="text-center text-xl tracking-widest"
                />
              </div>

              {otpState.error && (
                <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                  {otpState.error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={otpState.verifying || otp.length !== 6}
              >
                {otpState.verifying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify Phone
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={handleResendOTP}
                  disabled={!otpState.canResend || otpState.sending}
                >
                  {otpState.canResend ? "Resend OTP" : `Resend in ${otpState.resendCooldown}s`}
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="font-bold text-xl mb-2">Phone Verified!</h2>
            <p className="text-muted-foreground">
              Redirecting you back...
            </p>
          </motion.div>
        )}
      </div>

      {/* Invisible reCAPTCHA container - REQUIRED for Firebase Phone Auth */}
      <div id="recaptcha-container" />
    </div>
  );
};

export default CompleteProfile;
