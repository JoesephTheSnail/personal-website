'use client';

import { useRef } from 'react';
import Image from 'next/image';

// Square, sharp-cornered portrait with a flat accent block offset behind it (close and slightly
// faded so it supports the photo instead of competing with it).
// The block is the only graphic on the page header — one shape, one colour —
// and it reads as a plinth the portrait stands on.
export default function ProfilePhoto() {
  const photoRef = useRef<HTMLDivElement>(null);

  // Touch taps emit emulated mouse events and never a mouseleave, which could
  // leave the portrait tilted; pointer events tell us what is really moving.
  // The tilt is movement, so both reduced-motion settings switch it off.
  const motionOff = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('reduce-motion');

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = photoRef.current;
    if (!el || e.pointerType !== 'mouse' || motionOff()) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transition = 'transform 0.08s ease-out';
    el.style.transform = `perspective(700px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg)`;
  };

  const handleLeave = () => {
    const el = photoRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.5s var(--ease-out)';
    el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
  };

  return (
    <div
      ref={photoRef}
      className="relative flex-shrink-0 w-[148px] h-[148px] sm:w-[216px] sm:h-[216px]"
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 translate-x-2 translate-y-2 sm:translate-x-2.5 sm:translate-y-2.5"
        style={{ background: 'var(--accent)', opacity: 0.7 }}
      />
      <div className="relative w-full h-full overflow-hidden" style={{ background: 'var(--card-bg)' }}>
        <Image
          src="/arnav-chandra.jpg"
          alt="Arnav Chandra"
          width={432}
          height={432}
          sizes="(min-width: 640px) 216px, 148px"
          className="w-full h-full object-cover"
          priority
        />
      </div>
    </div>
  );
}
