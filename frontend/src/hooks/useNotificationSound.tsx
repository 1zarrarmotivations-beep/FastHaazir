import { useCallback, useRef, useEffect, useState } from 'react';

// High-quality notification sound as base64 (attention-grabbing bell)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2MkZaQkIuJiISCgH58e3l4d3Z1dXV2d3h5e3x+gIOGiY2RlZqdn6CgoJ+fnp2cm5qZmJeWlZSUk5OTk5OTlJSVlpeYmZqbnJ2en5+goKCfn56dnJuamZiXlpWUk5KSkZGQkJCQkJCRkZKSk5SVlpeYmZqbnJ2en5+goA==';

// Urgent order notification sound (louder, more attention-grabbing)
// This is a placeholder. In a real app, use a proper long alarm file URL.
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
  // Type as any because NodeJS.Timeout vs number can be tricky in frontend envs
  const ringingIntervalRef = useRef<any>(null);
  const [isRinging, setIsRinging] = useState(false);

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
    // Enable looping for order sound
    orderAudioRef.current.loop = true;

    return () => {
      // Cleanup on unmount
      if (ringingIntervalRef.current) {
        clearInterval(ringingIntervalRef.current);
      }
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
    // Allow urgent vibrations to bypass throttle if we are ringing
    if (pattern !== 'urgent' && now - lastVibrateTime.current < MIN_VIBRATE_INTERVAL) return false;

    lastVibrateTime.current = now;

    if (!canVibrate()) {
      return false;
    }

    try {
      const vibrationPattern = VIBRATION_PATTERNS[pattern];
      const result = navigator.vibrate(vibrationPattern);
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

  // Enable audio context on gesture
  const enableAudio = useCallback(() => {
    // Resume audio context if suspended (for Chrome auto-play policy)
    if (audioRef.current) {
      audioRef.current.play().then(() => audioRef.current?.pause()).catch(() => { });
    }
    if (orderAudioRef.current) {
      orderAudioRef.current.play().then(() => orderAudioRef.current?.pause()).catch(() => { });
    }
  }, []);

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

  // Start continuous ringing (Smart Order Alert)
  const startRinging = useCallback(() => {
    setIsRinging(true); // Always set true to ensure UI updates if used
    console.log('[Notification] Starting smart alert ringing...');

    // Play loop audio
    if (orderAudioRef.current) {
      orderAudioRef.current.currentTime = 0;
      orderAudioRef.current.loop = true;
      orderAudioRef.current.play().catch(e => console.error('Audio play failed', e));
    }

    // Interval for vibration and backup sound re-trigger
    if (ringingIntervalRef.current) clearInterval(ringingIntervalRef.current);

    // Initial vibrate
    vibrate('urgent');

    ringingIntervalRef.current = setInterval(() => {
      vibrate('urgent');
    }, 3000); // Vibrate every 3 seconds

  }, [vibrate]);

  // Stop continuous ringing
  const stopRinging = useCallback(() => {
    console.log('[Notification] Stopping smart alert ringing...');
    setIsRinging(false);

    if (ringingIntervalRef.current) {
      clearInterval(ringingIntervalRef.current);
      ringingIntervalRef.current = null;
    }

    if (orderAudioRef.current) {
      orderAudioRef.current.pause();
      orderAudioRef.current.currentTime = 0;
    }

    stopVibration();
  }, [stopVibration]);

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

    startRinging();

    // Speak if message provided
    if (speakMessage) {
      // Delay speech slightly to not overlap with sound start
      setTimeout(() => {
        speakNotification(speakMessage);
      }, 1000);
    }
  }, [startRinging, speakNotification]);

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
    speakNotification,

    // Vibration functions
    canVibrate,
    vibrate,
    stopVibration,

    // Ringing functions
    startRinging,
    stopRinging,
    isRinging,

    // Combined notifications
    notifyNewOrder,
    notifyAlert,
    notifySuccess,
    notifyError,

    // Audio context helper
    enableAudio
  };
};

export default useNotificationSound;
