'use client';

import { useEffect, useState } from 'react';

// Server Components can't pass a raw color-switching function as a prop
// to a Client Component, but they CAN pass already-rendered children —
// so the icon element itself is built server-side and just wrapped here,
// with the wrapper's `color` picked up by the icon's `fill="currentColor"`.
export default function ThemedIcon({
  color,
  lightColor,
  className,
  children,
}: {
  color: string;
  lightColor: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const update = () => setIsLight(document.documentElement.classList.contains('light'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  return (
    <span className={className} style={{ color: isLight ? lightColor : color }}>
      {children}
    </span>
  );
}
