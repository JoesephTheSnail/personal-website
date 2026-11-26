'use client';

import Link from 'next/link';

// Shown when a page throws while rendering. Keeps the site's look instead of the framework default.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-24">
      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-eyebrow)' }}>Something went wrong</p>
      <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1] tracking-[-0.04em]">This page did not load</h1>
      <p className="mt-5" style={{ color: 'var(--fg-70)' }}>It is probably a one-off. Try again, or head back to the home page.</p>
      <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
        <button type="button" onClick={reset} className="tap-44 rail-link text-[1.0625rem] underline underline-offset-4">Try again</button>
        <Link href="/" className="tap-44 rail-link text-[1.0625rem] underline underline-offset-4">Home</Link>
      </div>
    </div>
  );
}
