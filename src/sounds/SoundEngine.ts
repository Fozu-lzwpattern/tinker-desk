/**
 * SoundEngine — plays sound effects in response to pet events
 *
 * Uses Web Audio API for low-latency playback.
 * Supports user-defined sound mappings from settings.
 * Includes built-in sound synthesis for default sounds (no external files needed).
 */

import type { SoundMapping } from '../types';

/** Singleton AudioContext (created on first user interaction) */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/** Cache for loaded audio buffers */
const bufferCache = new Map<string, AudioBuffer>();

/** Volume control (0-1) */
let masterVolume = 0.5;

export function setMasterVolume(vol: number): void {
  masterVolume = Math.max(0, Math.min(1, vol));
}

/** Play a synthesized beep/chirp (no external file needed) */
export function playChirp(
  frequency = 800,
  duration = 0.1,
  type: OscillatorType = 'sine',
  volume = 0.3
): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, ctx.currentTime + duration);

    gain.gain.setValueAtTime(volume * masterVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available (e.g., no user gesture yet)
  }
}

/** Built-in sound effects (synthesized, no files needed) */
export const BuiltinSounds = {
  click: () => playChirp(1200, 0.05, 'sine', 0.2),
  pop: () => playChirp(600, 0.08, 'sine', 0.3),
  chirp: () => {
    playChirp(800, 0.06, 'sine', 0.25);
    setTimeout(() => playChirp(1000, 0.06, 'sine', 0.2), 70);
  },
  celebrate: () => {
    playChirp(523, 0.1, 'sine', 0.3);
    setTimeout(() => playChirp(659, 0.1, 'sine', 0.3), 120);
    setTimeout(() => playChirp(784, 0.15, 'sine', 0.3), 240);
  },
  sad: () => playChirp(400, 0.2, 'triangle', 0.2),
  notification: () => {
    playChirp(880, 0.08, 'sine', 0.25);
    setTimeout(() => playChirp(1100, 0.1, 'sine', 0.25), 100);
  },
  connect: () => {
    playChirp(440, 0.1, 'sine', 0.2);
    setTimeout(() => playChirp(660, 0.1, 'sine', 0.25), 150);
    setTimeout(() => playChirp(880, 0.15, 'sine', 0.3), 300);
  },
  disconnect: () => {
    playChirp(880, 0.1, 'triangle', 0.2);
    setTimeout(() => playChirp(440, 0.15, 'triangle', 0.2), 120);
  },
  search: () => {
    playChirp(600, 0.05, 'sine', 0.2);
    setTimeout(() => playChirp(800, 0.05, 'sine', 0.2), 80);
    setTimeout(() => playChirp(1000, 0.05, 'sine', 0.2), 160);
  },
  message: () => playChirp(700, 0.06, 'sine', 0.2),
};

/** Play a sound file from URL/path */
export async function playSound(src: string, volume = 0.5): Promise<void> {
  try {
    const ctx = getAudioContext();
    let buffer = bufferCache.get(src);

    if (!buffer) {
      const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();
      buffer = await ctx.decodeAudioData(arrayBuffer);
      bufferCache.set(src, buffer);
    }

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = volume * masterVolume;

    source.buffer = buffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch (err) {
    console.warn('[SoundEngine] playSound failed:', err);
  }
}

/** Play the appropriate sound for a pet event */
export function playSoundForEvent(
  eventName: string,
  soundMappings: SoundMapping
): void {
  // Check user-defined mapping first
  const mapping = soundMappings[eventName];
  if (mapping?.src) {
    playSound(mapping.src, mapping.volume ?? 0.5);
    return;
  }

  // Fall back to built-in synthesized sounds
  switch (eventName) {
    case 'pet_clicked':
      BuiltinSounds.click();
      break;
    case 'buddy_found':
    case 'celebrate':
      BuiltinSounds.celebrate();
      break;
    case 'sad':
      BuiltinSounds.sad();
      break;
    case 'dm_received':
    case 'message_received':
      BuiltinSounds.message();
      break;
    case 'peer_discovered':
    case 'connected':
      BuiltinSounds.connect();
      break;
    case 'disconnected':
      BuiltinSounds.disconnect();
      break;
    case 'searching':
      BuiltinSounds.search();
      break;
    case 'notification':
      BuiltinSounds.notification();
      break;
    default:
      break; // No sound for unmapped events
  }
}
