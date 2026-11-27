import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { eyebrow, smallCaps } from '@/components/typeClasses';
import HealthSections from '@/components/HealthSections';
import { ARCHIVES, getArchive } from '../data';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return ARCHIVES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const archive = getArchive(slug);
  if (!archive) return { title: 'Page not found' };
  return pageMetadata(
    `/health/archive/${slug}`,
    `Health archive: until ${archive.ended}`,
    `The health routine Arnav Chandra followed until ${archive.ended}, kept as it was: ${archive.sections.map((s) => s.title.toLowerCase()).join(', ')}.`,
  );
}

// One archived version. It is meant to look kept, not live: a status panel at the top says what it is and
// points to the current routine, the accent colour (which marks "current" elsewhere) is replaced by neutral
// grey, and the rules are dashed. Older and newer versions link to each other at the bottom.
export default async function HealthArchivePage({ params }: Props) {
  const { slug } = await params;
  const index = ARCHIVES.findIndex((a) => a.slug === slug);
  if (index < 0) notFound();
  const archive = ARCHIVES[index];
  const total = ARCHIVES.length;
  const number = total - index;
  const newer = ARCHIVES[index - 1]; // the list is newest first
  const older = ARCHIVES[index + 1];

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-12 sm:mb-14">
        <Link href="/health/archive" className="tap-44 rail-link inline-block text-[0.9375rem]" style={{ color: 'var(--fg-60)' }}>
          <span aria-hidden="true">←</span> All archived versions
        </Link>

        {/* Status panel (the archived-page banner other sites use): what this is, when it ended, where the live one is. */}
        <div
          role="note"
          aria-label="This page is archived"
          className="rise mt-4 max-w-2xl border border-dashed p-5"
          style={{ borderColor: 'var(--fg-30)' }}
        >
          <p className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 ${eyebrow}`} style={{ color: 'var(--fg-eyebrow)' }}>
            <span>Archived</span>
            <span className="tabular-nums" style={{ color: 'var(--fg-45)' }}>
              Version {String(number).padStart(2, '0')} of {String(total).padStart(2, '0')}
            </span>
          </p>
          <p className="mt-3 text-[0.9375rem] leading-relaxed" style={{ color: 'var(--fg-70)' }}>
            This is how I did things until {archive.ended}. It is kept as it was and is not updated. It is no longer what I follow.
          </p>
          <Link href="/health" className="tap-44 proud-link mt-3 inline-block pb-1 text-[0.9375rem]" style={{ color: 'var(--fg)' }}>
            See my current routine <span aria-hidden="true">→</span>
          </Link>
        </div>

        <p className={`rise mt-10 ${smallCaps}`} style={{ ['--d' as string]: '80ms', color: 'var(--fg-60)' } as React.CSSProperties}>
          Until {archive.ended}
        </p>
        <h1
          className="rise mt-3 max-w-3xl text-[clamp(2rem,4.6vw,3.25rem)] font-medium leading-[0.98] tracking-[-0.04em]"
          style={{ ['--d' as string]: '120ms', color: 'var(--fg-70)' } as React.CSSProperties}
        >
          {archive.title}
        </h1>
      </header>

      <HealthSections sections={archive.sections} archived />

      {(older || newer) && (
        <nav aria-label="Other archived versions" className="mt-2 grid gap-6 border-t border-dashed pt-6 sm:grid-cols-2" style={{ borderColor: 'var(--border-med)' }}>
          <div>
            {older && (
              <Link href={`/health/archive/${older.slug}`} className="index-row block">
                <span className={`block ${smallCaps}`} style={{ color: 'var(--fg-60)' }}>
                  <span aria-hidden="true">←</span> Older version
                </span>
                <span className="index-label mt-2 block text-[1.125rem] leading-snug tracking-[-0.015em]" style={{ color: 'var(--fg)' }}>
                  {older.title}
                </span>
                <span className={`mt-1 block ${smallCaps}`} style={{ color: 'var(--fg-45)' }}>Until {older.ended}</span>
              </Link>
            )}
          </div>
          <div className="sm:text-right">
            {newer && (
              <Link href={`/health/archive/${newer.slug}`} className="index-row block">
                <span className={`block ${smallCaps}`} style={{ color: 'var(--fg-60)' }}>
                  Newer version <span aria-hidden="true">→</span>
                </span>
                <span className="index-label mt-2 block text-[1.125rem] leading-snug tracking-[-0.015em]" style={{ color: 'var(--fg)' }}>
                  {newer.title}
                </span>
                <span className={`mt-1 block ${smallCaps}`} style={{ color: 'var(--fg-45)' }}>Until {newer.ended}</span>
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
