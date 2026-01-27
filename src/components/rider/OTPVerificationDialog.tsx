import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle2, XCircle, Loader2, KeyRound, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OTPVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: string;
  riderRequestId?: string;
  onVerified: () => void;
}

export function OTPVerificationDialog({
  open,
  onOpenChange,
  orderId,
  riderRequestId,
  onVerified,
}: OTPVerificationDialogProps) {
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setOtpDigits(['', '', '', '']);
      setVerificationStatus('idle');
      setErrorMessage('');
      setShake(false);
    }
  }, [open]);

  const handleDigitChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    // Clear error state when user types
    if (verificationStatus === 'error') {
      setVerificationStatus('idle');
      setErrorMessage('');
    }

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 4);
    if (/^\d{1,4}$/.test(pastedData)) {
      const newDigits = pastedData.split('').concat(['', '', '', '']).slice(0, 4);
      setOtpDigits(newDigits);
      
      // Focus last filled input or next empty one
      const lastFilledIndex = Math.min(pastedData.length - 1, 3);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const otp = otpDigits.join('');

  const handleVerify = async () => {
    if (otp.length !== 4) {
      toast.error('Please enter the complete 4-digit OTP');
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('idle');
    setErrorMessage('');

    try {
      const { data, error } = await supabase.rpc('verify_delivery_otp', {
        _order_id: orderId || null,
        _rider_request_id: riderRequestId || null,
        _otp: otp,
      });

      if (error) {
        console.error('[OTP] Verification error:', error);
        setVerificationStatus('error');
        setErrorMessage('Verification failed. Please try again.');
        triggerShake();
        return;
      }

      if (data === true) {
        setVerificationStatus('success');
        toast.success('OTP verified! Delivery confirmed.');
        setTimeout(() => {
          onVerified();
          onOpenChange(false);
        }, 1500);
      } else {
        setVerificationStatus('error');
        setErrorMessage('Incorrect OTP. Please confirm with customer.');
        triggerShake();
        // Clear inputs for retry
        setOtpDigits(['', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 300);
      }
    } catch (err) {
      console.error('[OTP] Exception:', err);
      setVerificationStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
      triggerShake();
    } finally {
      setIsVerifying(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleClose = () => {
    if (!isVerifying) {
      onOpenChange(false);
    }
  };

  const getIconBgColor = () => {
    if (verificationStatus === 'success') return 'rgba(16,185,129,0.15)';
    if (verificationStatus === 'error') return 'rgba(239,68,68,0.15)';
    return 'rgba(255,160,0,0.15)';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader className="text-center pb-2">
          {/* Icon */}
          <div className="mx-auto mb-4">
            <motion.div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: getIconBgColor() }}
              animate={verificationStatus === 'success' ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              {verificationStatus === 'success' ? (
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              ) : verificationStatus === 'error' ? (
                <XCircle className="w-10 h-10 text-destructive" />
              ) : (
                <Shield className="w-10 h-10 text-accent" />
              )}
            </motion.div>
          </div>

          {/* Title */}
          <DialogTitle className="text-xl text-foreground">
            {verificationStatus === 'success' 
              ? '✅ Verified!' 
              : verificationStatus === 'error'
              ? '❌ Verification Failed'
              : '🔐 Delivery OTP Required'}
          </DialogTitle>

          {/* Description */}
          <DialogDescription className="text-muted-foreground pt-1">
            {verificationStatus === 'success'
              ? 'Delivery confirmed successfully'
              : verificationStatus === 'error'
              ? errorMessage
              : 'Ask customer for the 4-digit OTP to complete delivery'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {verificationStatus !== 'success' && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5 mt-2"
            >
              {/* OTP Input Boxes */}
              <motion.div 
                className="flex justify-center gap-3"
                animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                {[0, 1, 2, 3].map((index) => (
                  <Input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otpDigits[index]}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={isVerifying}
                    className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 transition-all
                      ${verificationStatus === 'error' 
                        ? 'border-destructive bg-destructive/5 text-destructive' 
                        : 'border-border bg-muted/50 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20'
                      }
                    `}
                  />
                ))}
              </motion.div>

              {/* Helper Text */}
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <KeyRound className="w-4 h-4" />
                <span>Customer has this code in their app</span>
              </div>

              {/* Error Alert */}
              <AnimatePresence>
                {verificationStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
                  >
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                    <span className="text-sm text-destructive">{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Verify Button */}
              <Button
                onClick={handleVerify}
                disabled={otp.length !== 4 || isVerifying}
                className="w-full h-14 rounded-xl text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Verify & Complete Delivery
                  </>
                )}
              </Button>

              {/* Cancel */}
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={isVerifying}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
