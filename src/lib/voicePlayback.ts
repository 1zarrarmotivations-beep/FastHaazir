/**
 * Centralized Voice Message Playback Utility
 * 
 * CRITICAL FIXES for mobile browsers (Chrome Android, PWA, WebView):
 * 1. Audio unlock on first user interaction - MANDATORY
 * 2. Fresh Audio instance per play - NEVER reuse
 * 3. Global playback management - stop previous before new
 * 4. Wait for canplaythrough before play - prevent cut-off
 * 5. Proper cleanup on unmount
 */

// Global state
let currentAudio: HTMLAudioElement | null = null;
let isAudioUnlocked = false;

/**
 * Unlock audio on first user interaction
 * MUST be called from user gesture (click/tap)
 */
export const unlockAudio = (): void => {
  if (isAudioUnlocked) return;
  
  try {
    const silentAudio = new Audio();
    // Minimal valid WAV file
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
          console.log('[VoicePlayback] Audio context unlocked');
        })
        .catch(() => {
          console.log('[VoicePlayback] Audio unlock deferred to next interaction');
        });
    }
  } catch (e) {
    console.log('[VoicePlayback] Audio unlock error:', e);
  }
};

// Auto-unlock on first user interaction
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const handleFirstInteraction = () => {
    unlockAudio();
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('touchstart', handleFirstInteraction);
    document.removeEventListener('touchend', handleFirstInteraction);
    document.removeEventListener('keydown', handleFirstInteraction);
  };
  
  document.addEventListener('click', handleFirstInteraction, { passive: true });
  document.addEventListener('touchstart', handleFirstInteraction, { passive: true });
  document.addEventListener('touchend', handleFirstInteraction, { passive: true });
  document.addEventListener('keydown', handleFirstInteraction, { passive: true });
}

/**
 * Stop any currently playing audio globally
 */
export const stopCurrentAudio = (): void => {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = '';
    } catch (e) {
      // Ignore cleanup errors
    }
    currentAudio = null;
  }
};

/**
 * Check if specific audio instance is currently playing
 */
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
 * Simple one-shot voice playback
 * Creates fresh Audio, plays to completion, auto-cleans
 * USE THIS for simple play-and-forget scenarios
 */
export const playVoiceMessage = async (url: string): Promise<void> => {
  if (!url) {
    console.error('[VoicePlayback] No URL provided');
    return;
  }
  
  // Always unlock first
  unlockAudio();
  
  // Stop any existing playback
  stopCurrentAudio();
  
  return new Promise((resolve, reject) => {
    // Create FRESH Audio instance - NEVER reuse
    const audio = new Audio();
    
    // Critical mobile settings
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    (audio as any).playsInline = true;
    (audio as any).webkitPlaysInline = true;
    
    // Track as current
    currentAudio = audio;
    
    const cleanup = () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('canplaythrough', onCanPlay);
      if (currentAudio === audio) {
        currentAudio = null;
      }
    };
    
    const onEnded = () => {
      console.log('[VoicePlayback] Playback completed');
      cleanup();
      resolve();
    };
    
    const onError = (e: Event) => {
      const err = (e.target as HTMLAudioElement)?.error;
      console.error('[VoicePlayback] Error:', err?.code, err?.message);
      cleanup();
      reject(new Error(err?.message || 'Audio playback failed'));
    };
    
    const onCanPlay = () => {
      console.log('[VoicePlayback] Can play, starting...');
      audio.play()
        .then(() => console.log('[VoicePlayback] Playing'))
        .catch((err) => {
          console.error('[VoicePlayback] Play failed:', err);
          cleanup();
          reject(err);
        });
    };
    
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('canplaythrough', onCanPlay, { once: true });
    
    // Set source and begin loading
    audio.src = url;
    audio.load();
  });
};

/**
 * Create a controllable voice player with full callbacks
 * USE THIS for UI with play/pause/progress controls
 */
export const createVoicePlayer = (
  url: string,
  callbacks: PlaybackCallbacks = {}
): VoicePlaybackResult => {
  // Create FRESH Audio instance - NEVER reuse
  const audio = new Audio();
  
  // Critical mobile browser settings
  audio.crossOrigin = 'anonymous';
  audio.preload = 'auto';
  (audio as any).playsInline = true;
  (audio as any).webkitPlaysInline = true;
  
  let isCleanedUp = false;
  
  // Event handlers
  const handleLoadStart = () => {
    if (isCleanedUp) return;
    console.log('[VoicePlayback] Load started:', url.slice(-30));
    callbacks.onLoadStart?.();
  };
  
  const handleCanPlay = () => {
    if (isCleanedUp) return;
    console.log('[VoicePlayback] Can play, duration:', audio.duration);
    callbacks.onCanPlay?.();
  };
  
  const handleTimeUpdate = () => {
    if (isCleanedUp) return;
    callbacks.onTimeUpdate?.(audio.currentTime, audio.duration || 0);
  };
  
  const handleEnded = () => {
    if (isCleanedUp) return;
    console.log('[VoicePlayback] Playback ended naturally');
    callbacks.onEnded?.();
    if (currentAudio === audio) {
      currentAudio = null;
    }
  };
  
  const handleError = (e: Event) => {
    if (isCleanedUp) return;
    const err = (e.target as HTMLAudioElement)?.error;
    const errorMsg = err?.message || 'Unknown audio error';
    console.error('[VoicePlayback] Error:', err?.code, errorMsg);
    callbacks.onError?.(errorMsg);
    if (currentAudio === audio) {
      currentAudio = null;
    }
  };
  
  const handlePlay = () => {
    if (isCleanedUp) return;
    console.log('[VoicePlayback] Playing started');
    callbacks.onPlay?.();
  };
  
  const handlePause = () => {
    if (isCleanedUp) return;
    console.log('[VoicePlayback] Paused');
    callbacks.onPause?.();
  };
  
  // Attach listeners
  audio.addEventListener('loadstart', handleLoadStart);
  audio.addEventListener('canplay', handleCanPlay);
  audio.addEventListener('canplaythrough', handleCanPlay);
  audio.addEventListener('timeupdate', handleTimeUpdate);
  audio.addEventListener('ended', handleEnded);
  audio.addEventListener('error', handleError);
  audio.addEventListener('play', handlePlay);
  audio.addEventListener('pause', handlePause);
  
  // Set source and begin loading
  audio.src = url;
  audio.load();
  
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    
    try {
      audio.pause();
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlay);
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
    if (isCleanedUp) return false;
    
    try {
      // Always unlock on play attempt (user gesture)
      unlockAudio();
      
      // Stop any other audio that's playing
      if (currentAudio && currentAudio !== audio) {
        try {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        } catch (e) {
          // Ignore
        }
      }
      
      // Set this as current BEFORE waiting
      currentAudio = audio;
      
      // Wait for audio to be ready
      if (audio.readyState < 3) { // HAVE_FUTURE_DATA = 3
        console.log('[VoicePlayback] Waiting for audio to load... readyState:', audio.readyState);
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            audio.removeEventListener('canplaythrough', onReady);
            audio.removeEventListener('error', onError);
            reject(new Error('Audio load timeout'));
          }, 10000);
          
          const onReady = () => {
            clearTimeout(timeout);
            audio.removeEventListener('canplaythrough', onReady);
            audio.removeEventListener('error', onError);
            console.log('[VoicePlayback] Audio ready, readyState:', audio.readyState);
            resolve();
          };
          
          const onError = () => {
            clearTimeout(timeout);
            audio.removeEventListener('canplaythrough', onReady);
            audio.removeEventListener('error', onError);
            reject(new Error('Failed to load audio'));
          };
          
          audio.addEventListener('canplaythrough', onReady);
          audio.addEventListener('error', onError);
          
          // Trigger load if needed
          if (audio.readyState === 0) {
            audio.load();
          }
        });
      }
      
      // Reset position for replay
      audio.currentTime = 0;
      
      // Play with proper promise handling
      console.log('[VoicePlayback] Calling play()...');
      await audio.play();
      console.log('[VoicePlayback] Play successful');
      
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
    if (isCleanedUp) return;
    try {
      audio.pause();
    } catch (e) {
      // Ignore
    }
  };
  
  const stop = () => {
    if (isCleanedUp) return;
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
    if (isCleanedUp) return;
    try {
      const dur = audio.duration || 0;
      audio.currentTime = Math.max(0, Math.min(time, dur));
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
    isPlaying: () => !audio.paused && currentAudio === audio,
    cleanup,
  };
};
