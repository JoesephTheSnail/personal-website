'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import Image from 'next/image';

interface CoverItem {
  slug: string;
  title: string;
  cover: string;
}

export default function BookCoverScroll({ books }: { books: CoverItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number | null>(null);
  const speedRef = useRef(0);
  const [scrolled, setScrolled] = useState(false);
  const [hoverZone, setHoverZone] = useState<'left' | 'right' | null>(null);

  const stopScroll = useCallback(() => {
    speedRef.current = 0;
    setHoverZone(null);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    const step = () => {
      const el = trackRef.current;
      if (el && speedRef.current !== 0) {
        el.scrollLeft += speedRef.current;
        setScrolled(el.scrollLeft > 4);
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x    = e.clientX - rect.left;
    const w    = rect.width;
    const zone = w * 0.22;

    if (x < zone) {
      speedRef.current = -((zone - x) / zone) * 2.2;
      setHoverZone('left');
      startScroll();
    } else if (x > w - zone) {
      speedRef.current = ((x - (w - zone)) / zone) * 2.2;
      setHoverZone('right');
      startScroll();
    } else {
      setHoverZone(null);
      stopScroll();
    }
  }, [startScroll, stopScroll]);

  // Track scroll from native touch/trackpad scroll too
  const handleScroll = useCallback(() => {
    if (trackRef.current) setScrolled(trackRef.current.scrollLeft > 4);
  }, []);

  useEffect(() => () => stopScroll(), [stopScroll]);

  return (
    <div
      className="relative mb-10 select-none overflow-hidden"
      data-hide-cursor
      onMouseMove={handleMouseMove}
      onMouseLeave={stopScroll}
    >
      {/* Left fade — only when scrolled away from start */}
      <div
        className="absolute inset-y-0 left-0 w-16 z-10 pointer-events-none transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to right, var(--bg), transparent)',
          opacity: scrolled ? 1 : 0,
        }}
      />
      {/* Right fade — always visible to hint there's more */}
      <div
        className="absolute inset-y-0 right-0 w-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, var(--bg), transparent)' }}
      />

      {/* Glow overlays when hovering scroll zones */}
      <div
        className="absolute inset-y-0 left-0 w-24 z-20 pointer-events-none transition-opacity duration-100"
        style={{
          background: 'radial-gradient(ellipse at left center, rgba(255,255,255,0.07) 0%, transparent 75%)',
          opacity: hoverZone === 'left' ? 1 : 0,
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-24 z-20 pointer-events-none transition-opacity duration-100"
        style={{
          background: 'radial-gradient(ellipse at right center, rgba(255,255,255,0.07) 0%, transparent 75%)',
          opacity: hoverZone === 'right' ? 1 : 0,
        }}
      />

      {/* Hint arrows */}
      <div
        className="absolute inset-y-0 left-0 w-16 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-200"
        style={{ opacity: scrolled ? (hoverZone === 'left' ? 0.6 : 0.2) : 0 }}
      >
        <span className="text-white text-lg">‹</span>
      </div>
      <div
        className="absolute inset-y-0 right-0 w-16 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-200"
        style={{ opacity: hoverZone === 'right' ? 0.6 : 0.2 }}
      >
        <span className="text-white text-lg">›</span>
      </div>

      {/* Scrollable track — min-width:0 prevents iOS Safari from inflating parent to scroll-content width */}
      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto pb-6"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', minWidth: 0 }}
        onScroll={handleScroll}
      >
        {books.map((book) => (
          <a
            key={book.slug}
            href={`#${book.slug}`}
            title={book.title}
            className="flex-shrink-0 group"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(book.slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <div
              className="rounded overflow-hidden transition-all duration-200 group-hover:brightness-110"
              style={{
                width: 76,
                height: 114,
                position: 'relative',
                border: '1px solid var(--border-8)',
                flexShrink: 0,
              }}
            >
              <Image
                src={book.cover}
                alt={book.title}
                fill
                className="object-cover"
                sizes="76px"
                draggable={false}
              />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded"
                style={{ boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.6)' }}
              />
            </div>
          </a>
        ))}
        <div className="flex-shrink-0 w-4" />
      </div>
    </div>
  );
}
