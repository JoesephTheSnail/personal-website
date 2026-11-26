'use client';

import { useEffect, useState } from 'react';

// Two settings a visitor can force on regardless of what their OS reports.
// Both still respect prefers-reduced-motion/prefers-reduced-transparency as
// the default (see globals.css) — this is a manual override layered on
// top, not a replacement for it.
const MOTION_KEY = 'a11y-reduce-motion';
const TRANSPARENCY_KEY = 'a11y-reduce-transparency';
const SYNC_EVENT = 'a11y-prefs-changed';

function applyClass(className: string, on: boolean) {
  document.documentElement.classList.toggle(className, on);
}

export function useAccessibilityPrefs() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    const read = () => {
      const motion = localStorage.getItem(MOTION_KEY) === '1';
      const transparency = localStorage.getItem(TRANSPARENCY_KEY) === '1';
      setReduceMotion(motion);
      setReduceTransparency(transparency);
      applyClass('reduce-motion', motion);
      applyClass('reduce-transparency', transparency);
    };
    read();
    // The setting can be changed from the phone menu or the desktop corner
    // button; each instance re-reads when the other one changes it.
    window.addEventListener(SYNC_EVENT, read);
    return () => window.removeEventListener(SYNC_EVENT, read);
  }, []);

  const toggleMotion = () => {
    setReduceMotion((prev) => {
      const next = !prev;
      localStorage.setItem(MOTION_KEY, next ? '1' : '0');
      applyClass('reduce-motion', next);
      queueMicrotask(() => window.dispatchEvent(new Event(SYNC_EVENT)));
      return next;
    });
  };

  const toggleTransparency = () => {
    setReduceTransparency((prev) => {
      const next = !prev;
      localStorage.setItem(TRANSPARENCY_KEY, next ? '1' : '0');
      applyClass('reduce-transparency', next);
      queueMicrotask(() => window.dispatchEvent(new Event(SYNC_EVENT)));
      return next;
    });
  };

  return { reduceMotion, reduceTransparency, toggleMotion, toggleTransparency };
}
