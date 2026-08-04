'use client';

import { useEffect, useState } from 'react';

interface Props {
  src: string;
  title: string;
  allow?: string;
  allowFullScreen?: boolean;
  className?: string;
  /** Where to send someone if the embed can't be shown at all. */
  fallbackHref: string;
}

// Embeds previously rendered as a bare <iframe> with no loading or error
// state — a slow or blocked load (cross-origin frames often fail silently,
// with no load/error event at all) just presented as a flat rectangle with
// no explanation. This wraps every Drive/YouTube/Figma embed with a
// skeleton while it loads, and after a few seconds of silence — which
// covers both a genuine error and the frames that fail without ever
// firing one — offers a direct way out instead of leaving a dead box.
export default function EmbedFrame({ src, title, allow, allowFullScreen, className, fallbackHref }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, []);

  const showFallback = errored || (slow && !loaded);

  // Two call-site shapes exist here: three embeds sit in a padding-bottom
  // aspect-ratio box and need `className="absolute inset-0 …"` to inherit
  // that box's height (only an absolutely-positioned child fills a
  // padding-trick parent — a plain `h-full` child measures against the
  // parent's content height, which the trick keeps at zero); the Figma
  // prototype instead sits in a div with a real explicit height and just
  // wants `className="w-full h-full"`. The outer div below adopts whichever
  // contract the caller passed, so it fills its own parent correctly either
  // way. The inner div is always `relative` — it's what the skeleton
  // overlay and iframe actually position themselves against, independent
  // of whatever positioning the outer div itself is using.
  return (
    <div className={className}>
      <div className="relative w-full h-full">
        {!loaded && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-[inherit]"
            style={{ background: 'var(--card-bg)' }}
          >
            {showFallback ? (
              <div className="text-center px-4">
                <p className="text-xs mb-2" style={{ color: 'var(--fg-dim)' }}>
                  {errored ? "This preview couldn't load." : 'Still loading — it may not display here.'}
                </p>
                <a
                  href={fallbackHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium underline underline-offset-2"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  View it directly →
                </a>
              </div>
            ) : (
              <span className="embed-skeleton" aria-hidden="true" />
            )}
          </div>
        )}
        <iframe
          className="absolute inset-0 w-full h-full"
          src={src}
          title={title}
          allow={allow}
          allowFullScreen={allowFullScreen}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
        />
      </div>
    </div>
  );
}
