'use client';

import { useEffect, useState } from 'react';

// Two settings a visitor can force on regardless of what their OS reports.
// Both still respect prefers-reduced-motion/prefers-reduced-transparency as
// the default (see globals.css) — this is a manual override layered on
// top, not a replacement for it.
const MOTION_KEY = 'a11y-reduce-motion';
const TRANSPARENCY_KEY = 'a11y-reduce-transparency';

function applyClass(className: string, on: boolean) {
  document.documentElement.classList.toggle(className, on);
}

export function useAccessibilityPrefs() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    const motion = localStorage.getItem(MOTION_KEY) === '1';
    const transparency = localStorage.getItem(TRANSPARENCY_KEY) === '1';
    setReduceMotion(motion);
    setReduceTransparency(transparency);
    applyClass('reduce-motion', motion);
    applyClass('reduce-transparency', transparency);
  }, []);

  const toggleMotion = () => {
    setReduceMotion((prev) => {
      const next = !prev;
      localStorage.setItem(MOTION_KEY, next ? '1' : '0');
      applyClass('reduce-motion', next);
      return next;
    });
  };

  const toggleTransparency = () => {
    setReduceTransparency((prev) => {
      const next = !prev;
      localStorage.setItem(TRANSPARENCY_KEY, next ? '1' : '0');
      applyClass('reduce-transparency', next);
      return next;
    });
  };

  return { reduceMotion, reduceTransparency, toggleMotion, toggleTransparency };
}
