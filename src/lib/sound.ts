'use client';

// Every sound here is synthesized on the fly with the Web Audio API rather
// than loaded from an audio file — there's nothing to fetch, license, or
// keep in sync with the palette, and the whole module is a couple of
// hundred bytes. Two shapes: short sine partials for the deliberate,
// "something happened" moments (theme flip, panel open, subscribe), and a
// filtered noise tick for the mechanical one (hovering across tiles). All
// of it stays around peak gain 0.05 so it sits under normal system volume
// as texture rather than a beep.

const STORAGE_KEY = 'sound-enabled';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  // Browsers start contexts 'suspended' until a user gesture — every call
  // here already happens inside a click handler, so this resumes in place.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEY) !== 'off';
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
}

function tone(freq: number, startOffset: number, duration: number, peakGain: number, type: OscillatorType = 'sine', attack = 0.006) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + startOffset;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Generic, low-key confirmation for a link/nav-item click. */
export function playTick() {
  if (!isSoundEnabled()) return;
  tone(1500, 0, 0.05, 0.045);
}

/** Theme switch — a soft two-note "flip", pitched up going to light, down going to dark. */
export function playToggle(toLight: boolean) {
  if (!isSoundEnabled()) return;
  const [a, b] = toLight ? [740, 1108] : [880, 587];
  tone(a, 0, 0.09, 0.05);
  tone(b, 0.045, 0.11, 0.045);
}

/** Panel/menu open or close — a single soft pop, lower-pitched on close. */
export function playPop(opening: boolean) {
  if (!isSoundEnabled()) return;
  tone(opening ? 620 : 460, 0, 0.08, 0.04, 'triangle');
}

/** A short rising chime for a completed action (e.g. subscribe submit). */
export function playSuccess() {
  if (!isSoundEnabled()) return;
  tone(660, 0, 0.09, 0.045);
  tone(880, 0.06, 0.12, 0.05);
  tone(1320, 0.12, 0.15, 0.04);
}

// Short burst of white noise, generated once and reused for every click.
// A click is noise, not pitch — any oscillator, however short, still lands
// on a note, which is exactly what made the previous hover sound read as
// an instrument rather than a mechanism.
let noiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(c: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const len = Math.floor(c.sampleRate * 0.03);
    noiseBuffer = c.createBuffer(1, len, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/** One detent of a scroll wheel as the cursor crosses a tile: a dry, ~18ms filtered noise tick. Bandpassed to keep the small-plastic-mechanism character and highpassed so it never thuds. */
export function playHover(index = 0) {
  if (!isSoundEnabled()) return;
  const c = getCtx();
  if (!c) return;

  const src = c.createBufferSource();
  src.buffer = getNoiseBuffer(c);

  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  // A little variation per tile so a sweep across the grid doesn't sound
  // like one sample looping — but a narrow enough spread that it never
  // reads as a melody, which is the whole point of the change.
  band.frequency.value = 1900 + (((index % 4) + 4) % 4) * 130;
  band.Q.value = 1.4;

  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 900;

  const gain = c.createGain();
  const t0 = c.currentTime;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(0.05, t0 + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.018);

  src.connect(band).connect(hp).connect(gain).connect(c.destination);
  src.start(t0);
  src.stop(t0 + 0.04);
}
