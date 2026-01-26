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
import { installAudioUnlockListeners, isCurrentAudio, playVoice, stopCurrentAudio } from '@/lib/voicePlayback';
import { toast } from 'sonner';

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
  const lastAudioRef = useRef<HTMLAudioElement | null>(null);
  const detachRef = useRef<(() => void) | null>(null);
  const waveformHeightsRef = useRef<number[]>([]);

  // Generate stable waveform heights once
  if (waveformHeightsRef.current.length === 0) {
    waveformHeightsRef.current = Array.from({ length: 25 }, () => Math.random() * 100);
  }

  // Install one-time audio unlock listeners (first user gesture)
  useEffect(() => {
    installAudioUnlockListeners();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      detachRef.current?.();
      detachRef.current = null;

      if (isCurrentAudio(lastAudioRef.current)) {
        stopCurrentAudio();
      }
      lastAudioRef.current = null;
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
    if (!voiceUrl) {
      setHasError(true);
      return;
    }

    if (isPlaying) {
      stopCurrentAudio();
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);

      detachRef.current?.();
      detachRef.current = null;
      lastAudioRef.current = null;

      const audio = await playVoice(voiceUrl, 12_000);
      lastAudioRef.current = audio;

      const onLoadedMetadata = () => {
        if (audio.duration && audio.duration > 0 && isFinite(audio.duration)) {
          setAudioDuration(audio.duration);
        }
      };

      const onTimeUpdate = () => {
        if (lastAudioRef.current !== audio) return;
        setCurrentTime(audio.currentTime);
      };

      const onEnded = () => {
        if (lastAudioRef.current !== audio) return;
        setIsPlaying(false);
        setCurrentTime(0);
      };

      const onPause = () => {
        if (lastAudioRef.current !== audio) return;
        setIsPlaying(false);
        setIsLoading(false);
      };

      const onError = () => {
        if (lastAudioRef.current !== audio) return;
        setHasError(true);
        setIsPlaying(false);
        setIsLoading(false);
      };

      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('pause', onPause);
      audio.addEventListener('error', onError);

      detachRef.current = () => {
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('pause', onPause);
        audio.removeEventListener('error', onError);
      };

      setIsPlaying(true);
      setIsLoading(false);

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
