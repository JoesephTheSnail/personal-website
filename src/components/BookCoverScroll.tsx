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
      // The track's scrollbar is fully hidden (see .cover-track), so this
      // margin is the only gap under the covers — no hidden padding stacking
      // on top of it the way pb-6 used to.
      className="relative mb-3 select-none overflow-hidden"
      data-hide-cursor
      onMouseMove={handleMouseMove}
      onMouseLeave={stopScroll}
    >
      {/* Fade used to be a solid-colour div painted on top of the track —
          but that div and the scrollable track underneath it are each
          promoted to their own GPU-composited layer (see the comment on
          the track below), and two independently-composited layers meeting
          at an edge can leave a hairline seam where the layer underneath
          shows through by a subpixel, even though every CSS value lines up
          exactly. Masking the track's own content instead means the fade is
          painted in the *same* layer as the covers — there's no seam to
          leak through because there's no second layer. */}

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

      {/* Scrollable track — min-width:0 prevents iOS Safari from inflating parent
          to scroll-content width. position+z-index here isn't cosmetic: a plain
          `position: static` scroll container is a non-positioned box, which per
          spec should paint *before* (under) the z-index:20 glow/arrow overlays
          above — but Chromium promotes scrolling overflow to its own composited
          layer, which doesn't reliably honor that ordering. An explicit
          z-index puts the track in the same directly-compared stacking bucket
          as the overlays, so 0 < 20 is actually respected.
          The edge fade itself is a mask on the track, not a painted-over div —
          a separate div and this composited layer meeting at an edge can leave
          a hairline seam where the layer underneath shows through by a
          subpixel. A mask fades the track's own pixels directly, so there's
          no second layer for a seam to leak through. */}
      <div
        ref={trackRef}
        className="cover-track relative z-0 flex gap-3 overflow-x-auto pb-1"
        style={{
          minWidth: 0,
          maskImage: `linear-gradient(to right, ${scrolled ? 'transparent, black 64px,' : 'black,'} black calc(100% - 64px), transparent)`,
          WebkitMaskImage: `linear-gradient(to right, ${scrolled ? 'transparent, black 64px,' : 'black,'} black calc(100% - 64px), transparent)`,
        }}
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
                alt={`Cover of ${book.title}`}
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
