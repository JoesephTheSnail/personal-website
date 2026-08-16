'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

// Runs before paint on the client (no flash of the wrong state) but is a
// no-op during SSR, where layout effects aren't meaningful and React warns
// if you use one directly.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Whether text actually wraps to more than one line depends on its length,
// the viewport, and whatever else shares the line (an icon, a badge) — no
// fixed character count or height/line-height heuristic is safe across
// breakpoints and content. getClientRects() returns one rect per wrapped
// line for inline content, so more than one rect is a real wrap, checked
// directly instead of guessed. Re-measures on resize and once the real
// webfont swaps in, since fallback-font metrics can wrap differently.
export function useTextWraps<T extends HTMLElement>(watch: unknown): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [wraps, setWraps] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWraps(el.getClientRects().length > 1);
    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready?.then(measure);
    return () => window.removeEventListener('resize', measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);

  return [ref, wraps];
}
