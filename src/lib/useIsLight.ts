'use client';

import { useEffect, useState } from 'react';

// Most theming on this site flows through CSS vars that flip automatically
// under `html.light`. This hook is for the cases that can't: colors handed
// in as props (a category accent) or elements whose contrast is computed in
// JS, where there's no var to point at.
export function useIsLight(): boolean {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const update = () => setIsLight(document.documentElement.classList.contains('light'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  return isLight;
}
