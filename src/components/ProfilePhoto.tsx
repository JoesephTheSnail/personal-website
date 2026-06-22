'use client';

import { useRef } from 'react';
import Image from 'next/image';

export default function ProfilePhoto() {
  const photoRef = useRef<HTMLDivElement>(null);

  const bubblePhoto = () => {
    const el = photoRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.12s ease-out';
    el.style.transform  = 'perspective(400px) scale(1.09)';
    setTimeout(() => {
      el.style.transition = 'transform 0.55s cubic-bezier(0.34, 1.18, 0.64, 1)';
      el.style.transform  = 'perspective(400px) scale(1)';
    }, 120);
  };

  const handlePhotoMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = photoRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left)  / rect.width  - 0.5;
    const y = (e.clientY - rect.top)   / rect.height - 0.5;
    el.style.transition = 'transform 0.05s ease-out';
    el.style.transform  = `perspective(400px) rotateX(${(-y * 20).toFixed(1)}deg) rotateY(${(x * 20).toFixed(1)}deg) scale(1.07)`;
  };

  const handlePhotoLeave = () => {
    const el = photoRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.55s cubic-bezier(0.34, 1.15, 0.64, 1)';
    el.style.transform  = 'perspective(400px) rotateX(0deg) rotateY(0deg) scale(1)';
  };

  return (
    <div
      ref={photoRef}
      className="flex-shrink-0 cursor-pointer"
      style={{ width: 96, height: 96, flexShrink: 0 }}
      onClick={bubblePhoto}
      onMouseMove={handlePhotoMove}
      onMouseLeave={handlePhotoLeave}
    >
      <div
        className="w-full h-full rounded-full overflow-hidden"
        style={{
          border: '2px solid var(--border-med)',
          boxShadow: '0 0 0 4px var(--indigo-bg)',
        }}
      >
        <Image
          src="/profile.jpg"
          alt="Arnav Chandra"
          width={96}
          height={96}
          className="w-full h-full object-cover"
          priority
        />
      </div>
    </div>
  );
}
