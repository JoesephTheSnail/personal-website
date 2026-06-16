'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaHome } from 'react-icons/fa';

const MESSAGES = [
  "This page took a gap year.",
  "Still not back. We waited.",
  "We checked under the couch.",
  "Checked the fridge. Twice.",
  "Filed a missing page report.",
  "At this point it's living its best life elsewhere.",
  "We're just going to accept it now.",
  "You really committed to finding it, huh.",
];

const CHECKS = [
  { text: 'Under the couch', found: true },
  { text: 'Between sofa cushions', found: true },
  { text: 'The fridge (twice)', found: true },
  { text: 'Your browser history', found: true },
  { text: 'Under the couch again', found: false },
];

export default function NotFound() {
  const [clicks, setClicks] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const handleClick = () => {
    setClicks(c => c + 1);
    setSpinning(true);
    setTimeout(() => setSpinning(false), 700);
  };

  const msgIndex = Math.min(clicks, MESSAGES.length - 1);

  return (
    <div className="max-w-xl mx-auto min-h-[70vh] flex flex-col items-center justify-center text-center py-16 px-4">

      {/* Glitchy 404 */}
      <div className="relative mb-5 select-none" style={{ lineHeight: 1 }}>
        <span
          className="font-poppins font-semibold block"
          style={{ fontSize: 'clamp(72px, 18vw, 144px)', color: 'var(--fg)', letterSpacing: '-0.03em' }}
        >
          404
        </span>
        {/* Chromatic aberration layers */}
        <span
          aria-hidden
          className="font-poppins font-semibold block absolute inset-0 pointer-events-none"
          style={{ fontSize: 'clamp(72px, 18vw, 144px)', color: '#ff4466', letterSpacing: '-0.03em', opacity: 0.35, clipPath: 'inset(0 0 55% 0)', transform: 'translateX(5px)' }}
        >
          404
        </span>
        <span
          aria-hidden
          className="font-poppins font-semibold block absolute inset-0 pointer-events-none"
          style={{ fontSize: 'clamp(72px, 18vw, 144px)', color: '#44aaff', letterSpacing: '-0.03em', opacity: 0.35, clipPath: 'inset(55% 0 0 0)', transform: 'translateX(-5px)' }}
        >
          404
        </span>
      </div>

      <p className="font-poppins font-semibold text-xl mb-1.5" style={{ color: 'var(--fg)' }}>
        Page Not Found
      </p>
      <p className="text-sm mb-8 transition-all duration-300" style={{ color: 'var(--fg-dim)', minHeight: '1.5rem' }}>
        {MESSAGES[msgIndex]}
      </p>

      {/* Interactive rocket */}
      <button
        onClick={handleClick}
        aria-label="Click me"
        className="text-6xl leading-none mb-1.5 border-0 bg-transparent hover:scale-110 active:scale-90"
        style={{
          display: 'block',
          transform: spinning ? 'rotate(360deg) scale(1.15)' : 'rotate(0deg) scale(1)',
          transition: spinning
            ? 'transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94)'
            : 'transform 0.25s ease',
        }}
      >
        🚀
      </button>

      <p className="text-xs mb-10" style={{ color: 'var(--fg-dimmer)' }}>
        {clicks === 0
          ? 'click me'
          : `clicked ${clicks}×  ·  lost for ${seconds}s`}
      </p>

      {/* Search checklist */}
      <div className="text-left w-full mb-10 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-30)' }}>
          We searched
        </p>
        {CHECKS.map(({ text, found }) => (
          <div key={text} className="flex items-center gap-2.5 text-sm" style={{ color: found ? 'var(--fg-muted)' : 'var(--fg-dimmer)' }}>
            <span style={{ color: found ? '#34d399' : '#ef4444', flexShrink: 0 }}>
              {found ? '✓' : '✗'}
            </span>
            {text}{!found ? ' — still nothing.' : ''}
          </div>
        ))}
      </div>

      {/* Home button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
        style={{ background: 'var(--hover-bg)', border: '1px solid var(--border-med)', color: 'var(--fg)' }}
      >
        <FaHome size={13} />
        Take me home
      </Link>
    </div>
  );
}
