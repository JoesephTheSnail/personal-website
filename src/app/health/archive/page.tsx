import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';
import { eyebrow, smallCaps } from '@/components/typeClasses';
import { ARCHIVES } from './data';

export const metadata = pageMetadata(
  '/health/archive',
  'Health archive',
  'Earlier versions of the health routine Arnav Chandra followed, kept as they were.',
);

// The index of archived routines, newest first. Built from the list in ./data.tsx, so a new archive
// appears here, gets its own page and its numbering without touching this file.
// Shape borrowed from how other sites keep history: a plain reverse-chronological list (Now: Then,
// Bits of Simplicity's Past page), and an explicit "Archived" status plus a pointer to the current
// version on each entry (GOV.UK and MOJ archive banners).
export default function HealthArchiveIndex() {
  const total = ARCHIVES.length;
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-12 sm:mb-16">
        <Link href="/health" className="tap-44 rail-link inline-block text-[0.9375rem]" style={{ color: 'var(--fg-60)' }}>
          <span aria-hidden="true">←</span> Back to my current routine
        </Link>
        <p className={`rise mt-4 ${eyebrow}`} style={{ color: 'var(--fg-eyebrow)' }}>
          Archive
        </p>
        <h1
          className="rise mt-3 text-[clamp(2.25rem,5.2vw,3.75rem)] font-medium leading-[0.95] tracking-[-0.04em]"
          style={{ ['--d' as string]: '80ms', color: 'var(--fg)' } as React.CSSProperties}
        >
          Health archive
        </h1>
        <p
          className="rise mt-5 max-w-xl text-[clamp(1.05rem,1.8vw,1.25rem)] tracking-tight"
          style={{ ['--d' as string]: '160ms', color: 'var(--fg-60)' } as React.CSSProperties}
        >
          Every version of my routine I have retired, kept exactly as it was. What I follow now is on the main Health page.
        </p>
        <p
          className={`rise mt-6 ${smallCaps}`}
          style={{ ['--d' as string]: '230ms', color: 'var(--fg-60)' } as React.CSSProperties}
        >
          {total} archived {total === 1 ? 'version' : 'versions'}
        </p>
      </header>

      <ol className="border-t border-dashed" style={{ borderColor: 'var(--border-med)' }}>
        {ARCHIVES.map((a, i) => (
          <li key={a.slug} className="border-b border-dashed" style={{ borderColor: 'var(--border-med)' }}>
            <Link href={`/health/archive/${a.slug}`} className="index-row grid gap-x-8 gap-y-3 py-8 sm:grid-cols-[9rem_1fr]">
              <span className="flex items-baseline justify-between gap-4 sm:block">
                <span className={`block tabular-nums ${smallCaps}`} style={{ color: 'var(--fg-60)' }}>
                  Version {String(total - i).padStart(2, '0')}
                </span>
                <span className={`mt-2 inline-block border border-dashed px-2 py-0.5 ${smallCaps}`} style={{ color: 'var(--fg-60)', borderColor: 'var(--border-med)' }}>
                  Archived
                </span>
              </span>
              <span className="block min-w-0">
                <span className={`block ${smallCaps}`} style={{ color: 'var(--fg-60)' }}>
                  Until {a.ended}
                </span>
                <span className="index-label mt-2 block text-[clamp(1.35rem,2.6vw,1.75rem)] leading-tight tracking-[-0.025em]" style={{ color: 'var(--fg)' }}>
                  {a.title}
                </span>
                <span className="mt-2 block max-w-xl text-[0.9375rem] leading-relaxed" style={{ color: 'var(--fg-70)' }}>
                  {a.summary}
                </span>
                <span className={`mt-3 block ${smallCaps}`} style={{ color: 'var(--fg-45)' }}>
                  {a.sections.map((s) => s.title).join(' · ')}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-10 max-w-xl text-[0.875rem] leading-relaxed" style={{ color: 'var(--fg-60)' }}>
        When I change my routine again, the version I leave behind is added here.
      </p>
    </div>
  );
}
