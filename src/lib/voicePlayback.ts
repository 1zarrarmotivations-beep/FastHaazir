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
    // Must be triggered by user interaction (click/touch/keydown)
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
    // Still locked; user can trigger again via a later gesture.
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
    // Some mobile cases never fire canplaythrough; canplay is enough for HAVE_FUTURE_DATA.
    audio.addEventListener('canplay', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });

    audio.load();
  });
}

/**
 * The ONLY function voice play buttons should use.
 * Creates a new Audio() every call and ensures only one audio plays globally.
 */
export async function playVoice(url: string, timeoutMs: number = 12_000): Promise<HTMLAudioElement> {
  if (!url) throw new Error('Missing voice URL');

  // Ensure unlock listeners exist; unlocking itself must come from a gesture.
  installAudioUnlockListeners();

  // Called from a user click: safe to attempt unlock here.
  await unlockAudio();

  // Stop previous audio first.
  stopCurrentAudio();

  // Fresh instance per play.
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

  // Always start from the beginning on each click.
  try {
    audio.currentTime = 0;
  } catch {
    // ignore
  }

  await audio.play();
  return audio;
}

// Back-compat for any older call sites
export async function playVoiceMessage(url: string): Promise<void> {
  await playVoice(url);
}
