import { useCallback, useRef, useEffect } from 'react';

// High-quality notification sound as base64 (attention-grabbing bell)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2MkZaQkIuJiISCgH58e3l4d3Z1dXV2d3h5e3x+gIOGiY2RlZqdn6CgoJ+fnp2cm5qZmJeWlZSUk5OTk5OTlJSVlpeYmZqbnJ2en5+goKCfn56dnJuamZiXlpWUk5KSkZGQkJCQkJCRkZKSk5SVlpeYmZqbnJ2en5+goA==';

// Urgent order notification sound (louder, more attention-grabbing)
const ORDER_SOUND = 'data:audio/wav;base64,UklGRl9vT19teleQQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVNvdXJjZT0zNjAwLCBmcmVxPTQ0MCwgZ2Fpbj0wLjUsIGZhZGU9MC4xMHN0YXJ0';

// Vibration patterns (in milliseconds)
const VIBRATION_PATTERNS = {
  short: [100],
  medium: [200],
  long: [400],
  double: [100, 50, 100],
  triple: [100, 50, 100, 50, 100],
  urgent: [200, 100, 200, 100, 400], // For new orders - attention grabbing
  success: [50, 50, 100],
  error: [300, 100, 300],
};

export type VibrationPattern = keyof typeof VIBRATION_PATTERNS;

export const useNotificationSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const orderAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayTime = useRef<number>(0);
  const lastVibrateTime = useRef<number>(0);
  const MIN_INTERVAL = 2000; // Minimum 2 seconds between sounds
  const MIN_VIBRATE_INTERVAL = 1000; // Minimum 1 second between vibrations

  useEffect(() => {
    // Pre-create audio elements for faster playback
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.7;
    audioRef.current.preload = 'auto';
    
    orderAudioRef.current = new Audio(ORDER_SOUND);
    orderAudioRef.current.volume = 1.0; // Full volume for orders
    orderAudioRef.current.preload = 'auto';
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (orderAudioRef.current) {
        orderAudioRef.current.pause();
        orderAudioRef.current = null;
      }
    };
  }, []);

  // Check if vibration is supported
  const canVibrate = useCallback((): boolean => {
    return 'vibrate' in navigator;
  }, []);

  // Vibrate device with pattern
  const vibrate = useCallback((pattern: VibrationPattern = 'medium') => {
    const now = Date.now();
    if (now - lastVibrateTime.current < MIN_VIBRATE_INTERVAL) return false;
    
    lastVibrateTime.current = now;
    
    if (!canVibrate()) {
      console.log('[Notification] Vibration API not supported');
      return false;
    }

    try {
      const vibrationPattern = VIBRATION_PATTERNS[pattern];
      const result = navigator.vibrate(vibrationPattern);
      console.log(`[Notification] Vibrate (${pattern}):`, result);
      return result;
    } catch (error) {
      console.error('[Notification] Vibration error:', error);
      return false;
    }
  }, [canVibrate]);

  // Stop vibration
  const stopVibration = useCallback(() => {
    if (canVibrate()) {
      navigator.vibrate(0);
    }
  }, [canVibrate]);

  // Play notification sound
  const playSound = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTime.current < MIN_INTERVAL) return;
    
    lastPlayTime.current = now;
    
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((error) => {
          console.error('[Notification] Sound play error:', error);
        });
      }
    } catch (error) {
      console.error('[Notification] Failed to play notification sound:', error);
    }
  }, []);

  // Play order notification sound (louder, more urgent)
  const playOrderSound = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTime.current < MIN_INTERVAL) return;
    
    lastPlayTime.current = now;
    
    try {
      if (orderAudioRef.current) {
        orderAudioRef.current.currentTime = 0;
        orderAudioRef.current.play().catch((error) => {
          console.error('[Notification] Order sound play error:', error);
        });
      } else {
        // Fallback: create new audio element
        const audio = new Audio(ORDER_SOUND);
        audio.volume = 1.0;
        audio.play().catch(console.error);
      }
    } catch (error) {
      console.error('[Notification] Failed to play order sound:', error);
    }
  }, []);

  // Speak notification using Web Speech API
  const speakNotification = useCallback((message: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.1;
      utterance.pitch = 1.2;
      utterance.volume = 1;
      utterance.lang = 'en-US';
      
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Combined notification: sound + vibration + optional speech
  const notifyNewOrder = useCallback((speakMessage?: string) => {
    console.log('[Notification] New order notification triggered');
    
    // Play urgent vibration pattern
    vibrate('urgent');
    
    // Play order sound
    playOrderSound();
    
    // Speak if message provided
    if (speakMessage) {
      // Delay speech slightly to not overlap with sound
      setTimeout(() => {
        speakNotification(speakMessage);
      }, 500);
    }
  }, [vibrate, playOrderSound, speakNotification]);

  // Combined notification for general alerts
  const notifyAlert = useCallback((pattern: VibrationPattern = 'double') => {
    vibrate(pattern);
    playSound();
  }, [vibrate, playSound]);

  // Success notification
  const notifySuccess = useCallback(() => {
    vibrate('success');
    playSound();
  }, [vibrate, playSound]);

  // Error notification
  const notifyError = useCallback(() => {
    vibrate('error');
  }, [vibrate]);

  return {
    // Basic functions
    playSound,
    playOrderSound,
    speakNotification,
    
    // Vibration functions
    canVibrate,
    vibrate,
    stopVibration,
    
    // Combined notifications
    notifyNewOrder,
    notifyAlert,
    notifySuccess,
    notifyError,
  };
};

export default useNotificationSound;
