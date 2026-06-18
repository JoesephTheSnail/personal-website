'use client';

import { useEffect, useState } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const dark = saved !== 'light';
    setIsDark(dark);
    document.documentElement.classList.toggle('light', !dark);
  }, []);

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = !isDark;
    const rect = e.currentTarget.getBoundingClientRect();
    const root = document.documentElement;
    root.style.setProperty('--theme-x', `${rect.left + rect.width / 2}px`);
    root.style.setProperty('--theme-y', `${rect.top + rect.height / 2}px`);

    // Direction: to-light = expand, to-dark = rewind
    root.setAttribute('data-theme-dir', next ? 'to-dark' : 'to-light');

    const apply = () => {
      setIsDark(next);
      root.classList.toggle('light', !next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
    };

    if (typeof (document as any).startViewTransition !== 'function') {
      apply();
      return;
    }
    (document as any).startViewTransition(apply);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={`p-2 rounded-full transition-all duration-150 ${className}`}
      style={{
        background: 'var(--hover-bg)',
        color: 'var(--fg-35)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--fg)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--fg-35)'; }}
    >
      {isDark
        ? <FiSun size={16} />
        : <FiMoon size={16} />
      }
    </button>
  );
}
