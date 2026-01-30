import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Bell, BellOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';

/**
 * Android 13+ Notification Permission Dialog
 * Shows a user-friendly prompt to enable notifications
 */
export const AndroidNotificationSetup = () => {
  const { user } = useAuth();
  const { 
    isSupported, 
    isPermissionGranted, 
    isRegistered, 
    platform,
    requestPermission,
  } = usePushNotifications();

  const [showDialog, setShowDialog] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);

  // Check if we should show the permission dialog
  useEffect(() => {
    if (!user) return;
    
    // Only show on Android
    if (platform !== 'android') return;
    
    // Check if we've already asked
    const asked = localStorage.getItem('notification_permission_asked');
    if (asked) {
      setHasAsked(true);
      return;
    }

    // Show dialog if not permitted and not registered
    if (isSupported && !isPermissionGranted && !isRegistered) {
      // Delay to avoid showing immediately on app launch
      const timer = setTimeout(() => {
        setShowDialog(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [user, platform, isSupported, isPermissionGranted, isRegistered]);

  const handleEnable = async () => {
    setRequesting(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        setShowDialog(false);
      }
    } catch (err) {
      console.error('[AndroidNotificationSetup] Error:', err);
    } finally {
      setRequesting(false);
      localStorage.setItem('notification_permission_asked', 'true');
      setHasAsked(true);
    }
  };

  const handleSkip = () => {
    setShowDialog(false);
    localStorage.setItem('notification_permission_asked', 'true');
    setHasAsked(true);
  };

  // Don't render if not on Android or already has permission
  if (!user || platform !== 'android' || isPermissionGranted) {
    return null;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Bell className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">
            Stay Updated!
          </DialogTitle>
          <DialogDescription className="text-center">
            Enable notifications to receive:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span>Order status updates in real-time</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span>Rider arrival alerts</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span>Special offers and promotions</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={handleEnable}
            disabled={requesting}
            className="w-full"
          >
            {requesting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Enabling...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleSkip}
            className="w-full text-muted-foreground"
          >
            Maybe Later
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-2">
          You can change this anytime in Settings
        </p>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Notification Status Badge Component
 * Shows current notification status in settings/profile
 */
export const NotificationStatusBadge = () => {
  const { isPermissionGranted, isRegistered, platform } = usePushNotifications();

  if (platform !== 'android' && platform !== 'ios') {
    return null;
  }

  const isEnabled = isPermissionGranted && isRegistered;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
      isEnabled 
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    }`}>
      {isEnabled ? (
        <>
          <Bell className="h-3 w-3" />
          Enabled
        </>
      ) : (
        <>
          <BellOff className="h-3 w-3" />
          Disabled
        </>
      )}
    </div>
  );
};

export default AndroidNotificationSetup;
