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

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('light', !next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
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
