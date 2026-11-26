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
    // Speed is pixels per 60Hz frame, scaled by the real time between frames so
    // the strip moves at the same pace on 60, 90 and 120Hz screens and when a
    // frame is dropped. `carry` keeps the fraction that scrollLeft rounds away,
    // otherwise very slow speeds near the edge of the zone would stall.
    let last = 0;
    let carry = 0;
    const step = (now: number) => {
      const el = trackRef.current;
      const dt = last ? Math.min(now - last, 50) : 1000 / 60;
      last = now;
      if (el && speedRef.current !== 0) {
        const delta = speedRef.current * (dt / (1000 / 60)) + carry;
        const whole = Math.trunc(delta);
        carry = delta - whole;
        if (whole !== 0) el.scrollLeft += whole;
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
      className="relative select-none overflow-hidden"
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
          background: 'radial-gradient(ellipse at left center, rgba(91,163,194,0.14) 0%, transparent 75%)',
          opacity: hoverZone === 'left' ? 1 : 0,
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-24 z-20 pointer-events-none transition-opacity duration-100"
        style={{
          background: 'radial-gradient(ellipse at right center, rgba(91,163,194,0.14) 0%, transparent 75%)',
          opacity: hoverZone === 'right' ? 1 : 0,
        }}
      />

      {/* Hint arrows */}
      <div
        className="absolute inset-y-0 left-0 w-16 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-200"
        style={{ opacity: scrolled ? (hoverZone === 'left' ? 0.6 : 0.2) : 0 }}
      >
        <span className="text-lg" style={{ color: 'var(--fg)' }}>‹</span>
      </div>
      <div
        className="absolute inset-y-0 right-0 w-16 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-200"
        style={{ opacity: hoverZone === 'right' ? 0.6 : 0.2 }}
      >
        <span className="text-lg" style={{ color: 'var(--fg)' }}>›</span>
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
        className="cover-track relative z-0 flex gap-4 overflow-x-auto pb-2 pt-2"
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
              className="cover-item overflow-hidden"
              style={{
                width: 92,
                height: 138,
                position: 'relative',
                border: '1px solid var(--border-med)',
                flexShrink: 0,
              }}
            >
              <Image
                src={book.cover}
                alt={`Cover of ${book.title}`}
                fill
                className="object-cover"
                sizes="92px"
                draggable={false}
              />
            </div>
          </a>
        ))}
        <div className="flex-shrink-0 w-4" />
      </div>
    </div>
  );
}
