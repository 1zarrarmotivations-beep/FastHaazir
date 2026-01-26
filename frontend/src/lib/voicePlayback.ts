/**
 * Centralized Voice Message Playback Utility
 * 
 * Fixes for mobile browsers (Chrome Android, PWA, WebView):
 * 1. Audio unlock on first user interaction
 * 2. Fresh Audio instance per play (no reuse)
 * 3. Global playback management (stop previous before new)
 * 4. Proper event cleanup
 */

// Global audio instance tracker
let currentAudio: HTMLAudioElement | null = null;
let isAudioUnlocked = false;

// Audio unlock - call this on first user interaction
export const unlockAudio = (): void => {
  if (isAudioUnlocked) return;
  
  try {
    const silentAudio = new Audio();
    silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    silentAudio.volume = 0.01;
    silentAudio.muted = true;
    
    const playPromise = silentAudio.play();
    if (playPromise) {
      playPromise
        .then(() => {
          silentAudio.pause();
          silentAudio.src = '';
          isAudioUnlocked = true;
          console.log('[VoicePlayback] Audio unlocked successfully');
        })
        .catch(() => {
          console.log('[VoicePlayback] Audio unlock failed, will retry on next interaction');
        });
    }
  } catch (e) {
    console.log('[VoicePlayback] Audio unlock error:', e);
  }
};

// Initialize audio unlock on first user interaction
if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    unlockAudio();
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('touchstart', handleFirstInteraction);
    document.removeEventListener('keydown', handleFirstInteraction);
  };
  
  document.addEventListener('click', handleFirstInteraction, { once: true, passive: true });
  document.addEventListener('touchstart', handleFirstInteraction, { once: true, passive: true });
  document.addEventListener('keydown', handleFirstInteraction, { once: true, passive: true });
}

// Stop current audio playback
export const stopCurrentAudio = (): void => {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = '';
      currentAudio.load();
    } catch (e) {
      // Ignore cleanup errors
    }
    currentAudio = null;
  }
};

// Check if audio is currently playing
export const isCurrentlyPlaying = (audio: HTMLAudioElement | null): boolean => {
  return audio !== null && currentAudio === audio && !audio.paused;
};

export interface PlaybackCallbacks {
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export interface VoicePlaybackResult {
  audio: HTMLAudioElement;
  play: () => Promise<boolean>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  getDuration: () => number;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  cleanup: () => void;
}

/**
 * Create a fresh audio player for a voice message
 * Always creates a new Audio instance to avoid mobile browser issues
 */
export const createVoicePlayer = (
  url: string,
  callbacks: PlaybackCallbacks = {}
): VoicePlaybackResult => {
  // Create fresh Audio instance - NEVER reuse
  const audio = new Audio();
  
  // Essential mobile settings
  audio.crossOrigin = 'anonymous';
  audio.preload = 'auto';
  (audio as any).playsInline = true;
  (audio as any).webkitPlaysInline = true; // iOS Safari
  
  // Event handlers
  const handleLoadStart = () => {
    console.log('[VoicePlayback] Load started');
    callbacks.onLoadStart?.();
  };
  
  const handleCanPlay = () => {
    console.log('[VoicePlayback] Can play, duration:', audio.duration);
    callbacks.onCanPlay?.();
  };
  
  const handleTimeUpdate = () => {
    callbacks.onTimeUpdate?.(audio.currentTime, audio.duration || 0);
  };
  
  const handleEnded = () => {
    console.log('[VoicePlayback] Playback ended');
    callbacks.onEnded?.();
    if (currentAudio === audio) {
      currentAudio = null;
    }
  };
  
  const handleError = (e: Event) => {
    const err = (e.target as HTMLAudioElement)?.error;
    const errorMsg = err?.message || 'Unknown audio error';
    console.error('[VoicePlayback] Error:', err?.code, errorMsg);
    callbacks.onError?.(errorMsg);
    if (currentAudio === audio) {
      currentAudio = null;
    }
  };
  
  const handlePlay = () => {
    console.log('[VoicePlayback] Playing');
    callbacks.onPlay?.();
  };
  
  const handlePause = () => {
    console.log('[VoicePlayback] Paused');
    callbacks.onPause?.();
  };
  
  // Attach all listeners
  audio.addEventListener('loadstart', handleLoadStart);
  audio.addEventListener('canplay', handleCanPlay);
  audio.addEventListener('timeupdate', handleTimeUpdate);
  audio.addEventListener('ended', handleEnded);
  audio.addEventListener('error', handleError);
  audio.addEventListener('play', handlePlay);
  audio.addEventListener('pause', handlePause);
  
  // Set source and begin loading
  audio.src = url;
  audio.load();
  
  const cleanup = () => {
    try {
      audio.pause();
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.src = '';
      if (currentAudio === audio) {
        currentAudio = null;
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  };
  
  const play = async (): Promise<boolean> => {
    try {
      // Stop any currently playing audio
      stopCurrentAudio();
      
      // Set this as current
      currentAudio = audio;
      
      // Ensure audio is loaded
      if (audio.readyState < 2) {
        console.log('[VoicePlayback] Waiting for audio to load...');
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Load timeout')), 15000);
          
          const onReady = () => {
            clearTimeout(timeout);
            audio.removeEventListener('canplay', onReady);
            audio.removeEventListener('canplaythrough', onReady);
            audio.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = () => {
            clearTimeout(timeout);
            audio.removeEventListener('canplay', onReady);
            audio.removeEventListener('canplaythrough', onReady);
            audio.removeEventListener('error', onError);
            reject(new Error('Failed to load audio'));
          };
          
          audio.addEventListener('canplay', onReady);
          audio.addEventListener('canplaythrough', onReady);
          audio.addEventListener('error', onError);
        });
      }
      
      // Reset to beginning
      audio.currentTime = 0;
      
      // Play with promise handling
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      console.log('[VoicePlayback] Playback started successfully');
      return true;
    } catch (error: any) {
      console.error('[VoicePlayback] Play failed:', error?.name, error?.message);
      if (currentAudio === audio) {
        currentAudio = null;
      }
      throw error;
    }
  };
  
  const pause = () => {
    try {
      audio.pause();
    } catch (e) {
      // Ignore
    }
  };
  
  const stop = () => {
    try {
      audio.pause();
      audio.currentTime = 0;
      if (currentAudio === audio) {
        currentAudio = null;
      }
    } catch (e) {
      // Ignore
    }
  };
  
  const seek = (time: number) => {
    try {
      audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
    } catch (e) {
      // Ignore
    }
  };
  
  return {
    audio,
    play,
    pause,
    stop,
    seek,
    getDuration: () => audio.duration || 0,
    getCurrentTime: () => audio.currentTime || 0,
    isPlaying: () => !audio.paused,
    cleanup,
  };
};

/**
 * Simple one-shot play function for quick playback
 * Creates fresh Audio, plays, and auto-cleans on end
 */
export const playVoiceMessage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No URL provided'));
      return;
    }
    
    stopCurrentAudio();
    
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    (audio as any).playsInline = true;
    (audio as any).webkitPlaysInline = true;
    
    currentAudio = audio;
    
    const cleanup = () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.src = '';
      if (currentAudio === audio) {
        currentAudio = null;
      }
    };
    
    const onEnded = () => {
      cleanup();
      resolve();
    };
    
    const onError = () => {
      cleanup();
      reject(new Error('Audio playback failed'));
    };
    
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    
    audio.src = url;
    audio.load();
    
    audio.play()
      .then(() => console.log('[VoicePlayback] One-shot playing'))
      .catch((err) => {
        cleanup();
        reject(err);
      });
  });
};
