/**
 * Voice Note Player Component
 * 
 * CRITICAL FIXES for mobile browsers (Chrome Android, PWA, WebView):
 * 1. Fresh Audio instance on EVERY play - NEVER reuse
 * 2. Wait for canplaythrough before playing
 * 3. Global audio tracker to prevent overlapping
 * 4. Proper cleanup on unmount
 */

import { useState, useEffect, useRef, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Loader2 } from 'lucide-react';
import { unlockAudio } from '@/lib/voicePlayback';
import { toast } from 'sonner';

// Global audio tracker - ensures only one audio plays at a time
let globalCurrentAudio: HTMLAudioElement | null = null;

interface VoiceNotePlayerProps {
  voiceUrl: string;
  duration: number | null;
  isOwnMessage: boolean;
}

export const VoiceNotePlayer = memo(({ 
  voiceUrl, 
  duration,
  isOwnMessage 
}: VoiceNotePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformHeightsRef = useRef<number[]>([]);

  // Generate stable waveform heights once
  if (waveformHeightsRef.current.length === 0) {
    waveformHeightsRef.current = Array.from({ length: 25 }, () => Math.random() * 100);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.src = '';
          if (globalCurrentAudio === audioRef.current) {
            globalCurrentAudio = null;
          }
        } catch (e) {
          // Ignore cleanup errors
        }
        audioRef.current = null;
      }
    };
  }, []);

  // Reset state when URL changes
  useEffect(() => {
    setHasError(!voiceUrl);
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoading(false);
    if (duration && duration > 0) {
      setAudioDuration(duration);
    }
  }, [voiceUrl, duration]);

  const handlePlay = async () => {
    // CRITICAL: Unlock audio on user gesture (required for mobile)
    unlockAudio();

    if (!voiceUrl) {
      setHasError(true);
      return;
    }

    // If currently playing THIS audio, pause it
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);

      // Stop any globally playing audio first
      if (globalCurrentAudio && globalCurrentAudio !== audioRef.current) {
        try {
          globalCurrentAudio.pause();
          globalCurrentAudio.currentTime = 0;
          globalCurrentAudio.src = '';
        } catch (e) {
          // Ignore
        }
        globalCurrentAudio = null;
      }

      // Cleanup previous audio instance completely
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.src = '';
        } catch (e) {
          // Ignore
        }
        audioRef.current = null;
      }

      // Create FRESH Audio instance - CRITICAL: Never reuse
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      (audio as any).playsInline = true;
      (audio as any).webkitPlaysInline = true;

      // Store references
      audioRef.current = audio;
      globalCurrentAudio = audio;

      // Setup event handlers
      audio.onloadedmetadata = () => {
        if (audio.duration && audio.duration > 0 && isFinite(audio.duration)) {
          setAudioDuration(audio.duration);
        }
      };

      audio.ontimeupdate = () => {
        if (audioRef.current === audio) {
          setCurrentTime(audio.currentTime);
        }
      };

      audio.onended = () => {
        console.log('[VoiceNotePlayer] Playback ended');
        setIsPlaying(false);
        setCurrentTime(0);
        if (globalCurrentAudio === audio) {
          globalCurrentAudio = null;
        }
      };

      audio.onerror = (e) => {
        console.error('[VoiceNotePlayer] Audio error:', audio.error?.message);
        setHasError(true);
        setIsPlaying(false);
        setIsLoading(false);
        if (globalCurrentAudio === audio) {
          globalCurrentAudio = null;
        }
      };

      audio.onplay = () => {
        console.log('[VoiceNotePlayer] Playing');
        setIsPlaying(true);
        setIsLoading(false);
      };

      audio.onpause = () => {
        // Only update if not at end (avoid double state update)
        if (audio.currentTime < (audio.duration || Infinity) - 0.1) {
          setIsPlaying(false);
        }
      };

      // Set source
      audio.src = voiceUrl;

      // Wait for audio to be playable before attempting to play
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          audio.removeEventListener('canplaythrough', onReady);
          audio.removeEventListener('error', onLoadError);
          reject(new Error('Audio load timeout'));
        }, 15000);

        const onReady = () => {
          clearTimeout(timeout);
          audio.removeEventListener('canplaythrough', onReady);
          audio.removeEventListener('error', onLoadError);
          console.log('[VoiceNotePlayer] Audio ready to play');
          resolve();
        };

        const onLoadError = () => {
          clearTimeout(timeout);
          audio.removeEventListener('canplaythrough', onReady);
          audio.removeEventListener('error', onLoadError);
          reject(new Error('Audio load failed'));
        };

        audio.addEventListener('canplaythrough', onReady, { once: true });
        audio.addEventListener('error', onLoadError, { once: true });

        // Start loading
        audio.load();
      });

      // Reset to beginning and play
      audio.currentTime = 0;
      await audio.play();
      
      console.log('[VoiceNotePlayer] Play started successfully');

    } catch (error: any) {
      console.error('[VoiceNotePlayer] Play failed:', error?.name, error?.message);
      
      if (error?.name === 'NotAllowedError') {
        toast.error('Tap again to play audio');
      } else {
        setHasError(true);
        toast.error('Failed to play voice message');
      }
      
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className={`flex items-center gap-3 min-w-[180px] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <Button
        variant="ghost"
        size="icon"
        className={`h-10 w-10 rounded-full shrink-0 ${
          isOwnMessage 
            ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground' 
            : 'bg-primary/10 hover:bg-primary/20 text-primary'
        } ${hasError ? 'border-2 border-destructive' : ''}`}
        onClick={handlePlay}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : hasError ? (
          <Play className="w-5 h-5 ml-0.5 text-destructive" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </Button>
      
      <div className="flex-1 space-y-1">
        {/* Waveform / Progress Bar */}
        <div className="h-8 flex items-center gap-0.5">
          {waveformHeightsRef.current.map((height, i) => {
            const barProgress = (i / 25) * 100;
            const isActive = barProgress <= progress;
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all ${
                  isOwnMessage
                    ? isActive ? 'bg-primary-foreground' : 'bg-primary-foreground/30'
                    : isActive ? 'bg-primary' : 'bg-primary/30'
                } ${hasError ? 'opacity-50' : ''}`}
                style={{ height: `${20 + height * 0.6}%` }}
              />
            );
          })}
        </div>
        
        {/* Duration / Error state */}
        <div className={`flex justify-between text-xs ${
          isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
        }`}>
          {hasError ? (
            <span className="text-destructive">Tap to retry</span>
          ) : (
            <>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(audioDuration)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

VoiceNotePlayer.displayName = 'VoiceNotePlayer';
