/**
 * Voice playback (production-stable, mobile/PWA-safe)
 *
 * Rules enforced:
 * - Unlock audio once per session (first user gesture)
 * - Fresh Audio() per play (no reuse)
 * - Single global currentAudio (only one plays at a time)
 * - Wait for canplaythrough/canplay BEFORE play (timeout fallback)
 * - No self-cancelling stop/start logic
 */

let audioUnlocked = false;
let unlockListenersInstalled = false;

let currentAudio: HTMLAudioElement | null = null;

const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

export function installAudioUnlockListeners(): void {
  if (unlockListenersInstalled) return;
  if (typeof document === 'undefined') return;

  unlockListenersInstalled = true;

  const onFirstGesture = () => {
    void unlockAudio();
  };

  document.addEventListener('click', onFirstGesture, { once: true, passive: true });
  document.addEventListener('touchstart', onFirstGesture, { once: true, passive: true });
  document.addEventListener('keydown', onFirstGesture, { once: true, passive: true });
}

export async function unlockAudio(): Promise<boolean> {
  if (audioUnlocked) return true;

  try {
    const a = new Audio();
    a.src = SILENT_WAV_DATA_URI;
    a.muted = true;
    a.preload = 'auto';
    (a as any).playsInline = true;
    (a as any).webkitPlaysInline = true;

    await a.play();
    a.pause();
    a.src = '';
    a.load();
    audioUnlocked = true;
    return true;
  } catch {
    return false;
  }
}

export function stopCurrentAudio(): void {
  if (!currentAudio) return;

  try {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio.load();
  } catch {
    // ignore
  } finally {
    currentAudio = null;
  }
}

export function isCurrentAudio(audio: HTMLAudioElement | null): boolean {
  return !!audio && currentAudio === audio;
}

function waitForReady(audio: HTMLAudioElement, timeoutMs: number): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Audio load timeout'));
    }, timeoutMs);

    const onReady = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error('Audio load failed'));
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('error', onError);
    };

    audio.addEventListener('canplaythrough', onReady, { once: true });
    audio.addEventListener('canplay', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.load();
  });
}

export async function playVoice(url: string, timeoutMs: number = 12_000): Promise<HTMLAudioElement> {
  if (!url) throw new Error('Missing voice URL');

  installAudioUnlockListeners();
  await unlockAudio();
  stopCurrentAudio();

  const audio = new Audio();
  audio.preload = 'auto';
  (audio as any).playsInline = true;
  (audio as any).webkitPlaysInline = true;
  audio.src = url;

  currentAudio = audio;

  const clearIfCurrent = () => {
    if (currentAudio === audio) currentAudio = null;
  };

  audio.addEventListener('ended', clearIfCurrent, { once: true });
  audio.addEventListener('error', clearIfCurrent, { once: true });

  await waitForReady(audio, timeoutMs);

  try {
    audio.currentTime = 0;
  } catch {
    // ignore
  }

  await audio.play();
  return audio;
}

export async function playVoiceMessage(url: string): Promise<void> {
  await playVoice(url);
}
