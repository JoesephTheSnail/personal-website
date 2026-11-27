'use client';

import { useSyncExternalStore } from 'react';

// The one "mute sounds" setting for the whole site. Sound is ON by default; a visitor can turn it off in
// the accessibility menu (corner button on desktop, the menu sheet on phones) or with the speaker button
// in the 3D demo. Both read and write this same value, and it is remembered across visits.
// A tiny external store so React components can subscribe and plain audio code can just call isSoundMuted().

const KEY = 'sound-muted';

let muted = false;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    muted = window.localStorage.getItem(KEY) === '1';
  } catch {
    muted = false;
  }
  // another tab changed it
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    muted = e.newValue === '1';
    listeners.forEach((l) => l());
  });
}

export function isSoundMuted() {
  load();
  return muted;
}

export function setSoundMuted(next: boolean) {
  load();
  muted = next;
  try {
    window.localStorage.setItem(KEY, next ? '1' : '0');
  } catch {
    /* private mode: the choice just lasts for this visit */
  }
  listeners.forEach((l) => l());
}

export function useSoundMuted() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    isSoundMuted,
    () => false,
  );
}
