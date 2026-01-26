import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, XCircle, Loader2, KeyRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
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
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

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
        return;
      }

      if (data === true) {
        setVerificationStatus('success');
        toast.success('OTP verified successfully!');
        setTimeout(() => {
          onVerified();
          onOpenChange(false);
          setOtp('');
          setVerificationStatus('idle');
        }, 1500);
      } else {
        setVerificationStatus('error');
        setErrorMessage('Invalid OTP. Please ask customer for correct code.');
        setOtp('');
      }
    } catch (err) {
      console.error('[OTP] Exception:', err);
      setVerificationStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    if (!isVerifying) {
      setOtp('');
      setVerificationStatus('idle');
      setErrorMessage('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm bg-[#0B0F14] border-white/10">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4">
            <motion.div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: verificationStatus === 'success' 
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.1) 100%)'
                  : verificationStatus === 'error'
                  ? 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(255,160,0,0.2) 0%, rgba(255,107,0,0.1) 100%)'
              }}
              animate={verificationStatus === 'success' ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              {verificationStatus === 'success' ? (
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              ) : verificationStatus === 'error' ? (
                <XCircle className="w-10 h-10 text-red-400" />
              ) : (
                <Shield className="w-10 h-10 text-orange-400" />
              )}
            </motion.div>
          </div>
          <DialogTitle className="text-xl text-white">
            {verificationStatus === 'success' 
              ? 'Verified!' 
              : verificationStatus === 'error'
              ? 'Verification Failed'
              : 'Delivery OTP'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {verificationStatus === 'success'
              ? 'Delivery confirmed successfully'
              : verificationStatus === 'error'
              ? errorMessage
              : 'Enter the 4-digit OTP from customer to complete delivery'}
          </DialogDescription>
        </DialogHeader>

        {verificationStatus !== 'success' && (
          <div className="space-y-6 mt-4">
            {/* OTP Input */}
            <div className="flex justify-center">
              <InputOTP
                value={otp}
                onChange={setOtp}
                maxLength={4}
                disabled={isVerifying}
              >
                <InputOTPGroup className="gap-3">
                  {[0, 1, 2, 3].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="w-14 h-14 text-xl font-bold bg-white/5 border-white/10 text-white rounded-xl"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Info text */}
            <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
              <KeyRound className="w-4 h-4" />
              <span>Customer has this code in their order</span>
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleVerify}
              disabled={otp.length !== 4 || isVerifying}
              className="w-full h-14 rounded-2xl text-lg font-semibold"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              }}
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
              className="w-full text-white/60"
            >
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
