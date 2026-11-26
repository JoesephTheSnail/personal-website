import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';
import { eyebrow } from '@/components/typeClasses';
import HealthSections from '@/components/HealthSections';
import { ARCHIVE_SECTIONS } from './data';

export const metadata = pageMetadata('/health/archive', 'Health archive', 'The health routine Arnav Chandra followed until October 2026: training split, nutrition, sleep and supplements.');

export default function HealthArchivePage() {
  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-12 sm:mb-16">
        <Link href="/health" className="tap-44 rail-link inline-block text-[0.9375rem]" style={{ color: 'var(--fg-60)' }}>
          <span aria-hidden="true">←</span> Back to my current routine
        </Link>
        <p className={`rise mt-4 ${eyebrow}`} style={{ color: 'var(--accent)' }}>
          Archive
        </p>
        <h1
          className="rise mt-3 text-[clamp(2.25rem,5.2vw,3.75rem)] font-medium leading-[0.95] tracking-[-0.04em]"
          style={{ ['--d' as string]: '80ms', color: 'var(--fg)' } as React.CSSProperties}
        >
          Health, until October 2026
        </h1>
        <p
          className="rise mt-5 max-w-xl text-[clamp(1.05rem,1.8vw,1.25rem)] tracking-tight"
          style={{ ['--d' as string]: '160ms', color: 'var(--fg-60)' } as React.CSSProperties}
        >
          This is what I used to do, kept as it was. What I follow now is on the main health page.
        </p>
      </header>

      <HealthSections sections={ARCHIVE_SECTIONS} />
    </div>
  );
}
