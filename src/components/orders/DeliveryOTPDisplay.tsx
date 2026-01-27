import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, EyeOff, Copy, CheckCircle2, Lock, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DeliveryOTPDisplayProps {
  otp: string;
  isVerified?: boolean;
  className?: string;
}

const AUTO_HIDE_SECONDS = 12;

export function DeliveryOTPDisplay({ otp, isVerified = false, className = '' }: DeliveryOTPDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Auto-hide OTP after countdown
  useEffect(() => {
    if (!isVisible || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setIsVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, countdown]);

  const handleShowOTP = useCallback(() => {
    setIsVisible(true);
    setCountdown(AUTO_HIDE_SECONDS);
  }, []);

  const handleHideOTP = useCallback(() => {
    setIsVisible(false);
    setCountdown(0);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(otp);
    setCopied(true);
    toast.success('OTP copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [otp]);

  // Verified State - Show success message
  if (isVerified) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-green-500/10 border border-emerald-500/30 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-emerald-700 dark:text-emerald-400">
              ✅ Delivery Verified
            </h4>
            <p className="text-sm text-emerald-600/80 dark:text-emerald-400/70">
              Your order has been safely delivered.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <Lock className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground text-sm">
            🔐 Your Delivery OTP
          </h4>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        Share this OTP with the rider <span className="font-medium text-foreground">only when they arrive</span>.
        Delivery cannot be completed without this code.
      </p>

      {/* OTP Display Area */}
      <div className="flex items-center gap-2 mb-3">
        <motion.div 
          className="flex-1 relative overflow-hidden rounded-xl bg-card border border-border"
          layout
        >
          <div className="flex items-center justify-center py-4 px-3">
            <AnimatePresence mode="wait">
              {isVisible ? (
                <motion.div
                  key="visible"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-2xl font-mono font-bold tracking-[0.4em] text-primary">
                    {otp}
                  </span>
                  {countdown > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                      <Timer className="w-3 h-3" />
                      {countdown}s
                    </span>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="hidden"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-2xl font-mono font-bold tracking-[0.4em] text-muted-foreground/50">
                    • • • •
                  </span>
                  <span className="text-xs text-muted-foreground">Tap to reveal</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Toggle Visibility Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={isVisible ? handleHideOTP : handleShowOTP}
          className="h-14 w-14 rounded-xl border-border hover:bg-muted shrink-0"
        >
          {isVisible ? (
            <EyeOff className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Eye className="w-5 h-5 text-primary" />
          )}
        </Button>

        {/* Copy Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopy}
          disabled={!isVisible}
          className="h-14 w-14 rounded-xl border-border hover:bg-muted shrink-0 disabled:opacity-40"
        >
          {copied ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <Copy className="w-5 h-5 text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* Trust Footer */}
      <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/50">
        <Shield className="w-3.5 h-3.5 text-primary/60" />
        <span className="text-[10px] text-muted-foreground">
          🛡️ For your safety, OTP is required for delivery confirmation
        </span>
      </div>
    </motion.div>
  );
}
