import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DeliveryOTPDisplayProps {
  otp: string;
  isVerified?: boolean;
  className?: string;
}

export function DeliveryOTPDisplay({ otp, isVerified = false, className = '' }: DeliveryOTPDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(otp);
    setCopied(true);
    toast.success('OTP copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isVerified) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 ${className}`}
      >
        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          Delivery Verified ✓
        </span>
      </motion.div>
    );
  }

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-r from-primary/10 to-orange-500/10 border border-primary/20 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-primary" />
        <span className="text-sm font-semibold text-foreground">Delivery OTP</span>
      </div>
      
      <p className="text-xs text-muted-foreground mb-3">
        Share this code with rider at delivery
      </p>

      <div className="flex items-center gap-2">
        <motion.div 
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-card border border-border"
          whileTap={{ scale: 0.98 }}
        >
          {isVisible ? (
            <span className="text-2xl font-mono font-bold tracking-[0.5em] text-foreground">
              {otp}
            </span>
          ) : (
            <span className="text-2xl font-mono font-bold tracking-[0.5em] text-muted-foreground">
              ••••
            </span>
          )}
        </motion.div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsVisible(!isVisible)}
          className="h-12 w-12"
        >
          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleCopy}
          className="h-12 w-12"
        >
          {copied ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        🔒 Only share when rider arrives
      </p>
    </div>
  );
}
