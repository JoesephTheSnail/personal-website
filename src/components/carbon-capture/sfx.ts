// ---------------------------------------------------------------------------
// Sound effects for the carbon-capture tour.
//
// Every sound here is synthesised at runtime with the Web Audio API (a few
// oscillators and one burst of filtered noise). There are no audio files, no
// samples and no third-party packs, so there is nothing to license or
// attribute: the sounds are original to this project.
//
// Rules the engine follows:
//  - Quiet and short. Peak gains are 0.02–0.07, the longest sound is ~0.4 s,
//    and everything runs through a compressor so overlaps can't get loud.
//  - Hovering can't pile up: one sound per 90 ms at most, the same part can't
//    retrigger for 450 ms, and no more than 5 hover ticks in any 2 s window.
//  - Browsers only allow audio after a user gesture (Safari is strictest):
//    the context is created and resumed inside the first tap / click / key
//    press, and a silent buffer is played in that same gesture. Until then
//    every call is a silent no-op rather than a queued burst.
//  - Mute is remembered in localStorage.
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react';

type AudioCtor = typeof AudioContext;
type WindowWithWebkit = Window & { webkitAudioContext?: AudioCtor };

const MUTE_KEY = 'cc-sfx-muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let unlockInstalled = false;

// ---- mute state (tiny external store so React can subscribe) ---------------

let muted = false;
let mutedLoaded = false;
const listeners = new Set<() => void>();

function loadMuted() {
  if (mutedLoaded || typeof window === 'undefined') return;
  mutedLoaded = true;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    muted = false;
  }
}

export function isMuted() {
  loadMuted();
  return muted;
}

export function setMuted(next: boolean) {
  loadMuted();
  muted = next;
  try {
    window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {
    /* private mode: the choice just lasts for this visit */
  }
  listeners.forEach((l) => l());
}

export function useSfxMuted() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    isMuted,
    () => false,
  );
}

// ---- context + gesture unlock ----------------------------------------------

function ensureContext() {
  if (ctx || typeof window === 'undefined') return ctx;
  const Ctor = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor({ latencyHint: 'interactive' });
  master = ctx.createGain();
  master.gain.value = 0.9;
  // a gentle limiter: whatever overlaps, the output stays capped
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -24;
  comp.knee.value = 20;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;
  master.connect(comp);
  comp.connect(ctx.destination);
  // when the OS interrupts audio (a call, locking the phone), pick back up
  ctx.addEventListener('statechange', () => {
    if (ctx && (ctx.state as string) === 'interrupted') void ctx.resume().catch(() => {});
  });
  return ctx;
}

function unlockNow() {
  const c = ensureContext();
  if (!c) return;
  // Safari: resume() and a (silent) sound both have to happen inside the gesture
  void c.resume().catch(() => {});
  try {
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22050);
    src.connect(c.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
  // Ask iOS to treat this as ambient sound: it mixes with the user's music
  // instead of stopping it. (It still follows the ring/silent switch, which a
  // web page can't override.)
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = 'ambient';
  } catch {
    /* ignore */
  }
}

const UNLOCK_EVENTS = ['touchend', 'pointerup', 'click', 'keydown'] as const;

/** Call once on mount. Arms the first-gesture unlock; safe to call twice. */
export function installAudioUnlock() {
  if (unlockInstalled || typeof window === 'undefined') return () => {};
  unlockInstalled = true;
  const handler = () => {
    unlockNow();
    if (ctx && ctx.state === 'running') {
      UNLOCK_EVENTS.forEach((e) => window.removeEventListener(e, handler, true));
      unlockInstalled = false;
      // anything later that suspends it again (tab switch) resumes on the next gesture
      const relisten = () => {
        if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => {});
      };
      document.addEventListener('visibilitychange', relisten);
    }
  };
  UNLOCK_EVENTS.forEach((e) => window.addEventListener(e, handler, true));
  return () => {
    UNLOCK_EVENTS.forEach((e) => window.removeEventListener(e, handler, true));
    unlockInstalled = false;
  };
}

/** True once the browser has let us make sound. */
function ready() {
  loadMuted();
  if (muted || !ctx || !master) return false;
  if (typeof document !== 'undefined' && document.hidden) return false;
  if (ctx.state !== 'running') {
    void ctx.resume().catch(() => {});
    return false; // drop this one; the next call will play
  }
  return true;
}

// ---- building blocks -------------------------------------------------------

type ToneOpts = {
  freq: number;
  endFreq?: number;
  dur: number;
  gain: number;
  type?: OscillatorType;
  delay?: number;
  attack?: number;
};

function tone({ freq, endFreq, dur, gain, type = 'sine', delay = 0, attack = 0.006 }: ToneOpts) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function sweep(fromHz: number, toHz: number, dur: number, gain: number, delay = 0) {
  if (!ctx || !master) return;
  if (!noiseBuffer) {
    const len = Math.floor(ctx.sampleRate * 0.5);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(fromHz, t0);
  filter.frequency.exponentialRampToValueAtTime(toHz, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.03);
}

// ---- hover throttling ------------------------------------------------------

const HOVER_MIN_GAP_MS = 90;
const HOVER_SAME_ID_MS = 450;
const HOVER_WINDOW_MS = 2000;
const HOVER_WINDOW_MAX = 5;
let lastHoverAt = 0;
const lastHoverById = new Map<string, number>();
let hoverTimes: number[] = [];
const STEP_MIN_GAP_MS = 250;
let lastStepAt = -1e9;

// five notes of a pentatonic scale, so a sweep across parts sounds like a
// soft run of notes, not one repeated beep
const HOVER_NOTES = [784, 880, 988, 1175, 1319];
function noteFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return HOVER_NOTES[h % HOVER_NOTES.length];
}

// ---- the sounds ------------------------------------------------------------

export const sfx = {
  /** pointer moves onto a part (mouse only; call with a stable id) */
  hover(id: string) {
    if (!ready()) return;
    const now = performance.now();
    if (now - lastHoverAt < HOVER_MIN_GAP_MS) return;
    if (now - (lastHoverById.get(id) ?? -1e9) < HOVER_SAME_ID_MS) return;
    hoverTimes = hoverTimes.filter((t) => now - t < HOVER_WINDOW_MS);
    if (hoverTimes.length >= HOVER_WINDOW_MAX) return;
    lastHoverAt = now;
    lastHoverById.set(id, now);
    hoverTimes.push(now);
    tone({ freq: noteFor(id), dur: 0.055, gain: 0.02 });
  },

  /** a part is selected (click / tap) */
  select() {
    if (!ready()) return;
    tone({ freq: 523, dur: 0.1, gain: 0.05, type: 'triangle' });
    tone({ freq: 784, dur: 0.16, gain: 0.045, type: 'triangle', delay: 0.07 });
  },

  /** a selected part is dismissed */
  deselect() {
    if (!ready()) return;
    tone({ freq: 659, endFreq: 440, dur: 0.14, gain: 0.035, type: 'triangle' });
  },

  /** Next / Back / a dot: a soft whoosh whose direction follows the move */
  step(direction: 1 | -1) {
    if (!ready()) return;
    // tapping Next several times quickly shouldn't stack whooshes
    const now = performance.now();
    if (now - lastStepAt < STEP_MIN_GAP_MS) return;
    lastStepAt = now;
    if (direction === 1) sweep(320, 1500, 0.28, 0.05);
    else sweep(1500, 320, 0.28, 0.05);
  },

  /** the camera has arrived at a stage */
  arrive() {
    if (!ready()) return;
    tone({ freq: 659, dur: 0.12, gain: 0.03, delay: 0.02 });
  },

  /** a shell goes glassy to show what's inside (the tanks) */
  open() {
    if (!ready()) return;
    tone({ freq: 330, endFreq: 660, dur: 0.3, gain: 0.04 });
    tone({ freq: 990, dur: 0.22, gain: 0.025, delay: 0.14 });
    tone({ freq: 1319, dur: 0.2, gain: 0.015, delay: 0.2 });
  },

  /** the mute button itself: a small confirmation when sound comes back */
  on() {
    // bypass the muted check: this plays right after unmuting
    if (!ctx || !master || ctx.state !== 'running') return;
    tone({ freq: 600, dur: 0.06, gain: 0.035 });
    tone({ freq: 900, dur: 0.08, gain: 0.03, delay: 0.05 });
  },
};
