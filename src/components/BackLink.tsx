'use client';

import { useRouter } from 'next/navigation';

// Plain `<Link href="/projects">` always jumped to the top grid, even when
// you'd actually arrived via a category page (grid → category → project) —
// skipping right past the category you came from. Browser history doesn't
// have that problem: `back()` naturally lands wherever you actually were,
// falling back to `fallbackHref` only when there's no in-site history to
// return to (e.g. the project was opened directly from an external link).
export default function BackLink({ fallbackHref, label }: { fallbackHref: string; label: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className="inline-flex items-center gap-1.5 text-sm transition-colors mb-8"
      style={{ color: 'var(--fg-eyebrow)' }}
    >
      ← {label}
    </button>
  );
}
