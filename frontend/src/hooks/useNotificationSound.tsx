import { useCallback, useRef, useEffect } from 'react';

// Notification sound as base64 (short bell sound)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2MkZaQkIuJiISCgH58e3l4d3Z1dXV2d3h5e3x+gIOGiY2RlZqdn6CgoJ+fnp2cm5qZmJeWlZSUk5OTk5OTlJSVlpeYmZqbnJ2en5+goKCfn56dnJuamZiXlpWUk5KSkZGQkJCQkJCRkZKSk5SVlpeYmZqbnJ2en5+goA==';

// Order notification sound
const ORDER_SOUND = 'data:audio/wav;base64,UklGRl9vT19teleQQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVNvdXJjZT0zNjAwLCBmcmVxPTQ0MCwgZ2Fpbj0wLjUsIGZhZGU9MC4xMHN0YXJ0';

export const useNotificationSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayTime = useRef<number>(0);
  const MIN_INTERVAL = 2000; // Minimum 2 seconds between sounds

  useEffect(() => {
    // Pre-create audio element
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.6;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playSound = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTime.current < MIN_INTERVAL) return;
    
    lastPlayTime.current = now;
    
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }, []);

  const playOrderSound = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTime.current < MIN_INTERVAL) return;
    
    lastPlayTime.current = now;
    
    try {
      const audio = new Audio(ORDER_SOUND);
      audio.volume = 0.8;
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Failed to play order sound:', error);
    }
  }, []);

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

  return {
    playSound,
    playOrderSound,
    speakNotification,
  };
};

export default useNotificationSound;
