import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';
import { eyebrow } from '@/components/typeClasses';
import HealthSections from '@/components/HealthSections';
import { SECTIONS } from './data';

export const metadata = pageMetadata('/health', 'Health', 'How Arnav Chandra approaches health right now: a 6 am start, gym training, an evening wind down, nutrition and journaling.');

export default function HealthPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-12 sm:mb-16">
        <p className={`rise ${eyebrow}`} style={{ color: 'var(--accent)' }}>
          My protocol
        </p>
        <h1
          className="rise mt-3 text-[clamp(2.25rem,5.2vw,3.75rem)] font-medium leading-[0.95] tracking-[-0.04em]"
          style={{ ['--d' as string]: '80ms', color: 'var(--fg)' } as React.CSSProperties}
        >
          Health
        </h1>
        <p
          className="rise mt-4 text-[clamp(1.05rem,1.8vw,1.25rem)] tracking-tight"
          style={{ ['--d' as string]: '160ms', color: 'var(--fg-60)' } as React.CSSProperties}
        >
          What I follow right now, why I do it, and what I&apos;ve learned.
        </p>
        <blockquote
          className="rise mt-8 max-w-xl border-l-2 pl-5"
          style={{ ['--d' as string]: '200ms', borderColor: 'var(--accent)' } as React.CSSProperties}
        >
          <p className="text-[clamp(1.1rem,1.8vw,1.3rem)] leading-snug tracking-[-0.01em]" style={{ color: 'var(--fg)' }}>
            &ldquo;What is to give light must endure burning.&rdquo;
          </p>
          <footer className="mt-2 text-[0.875rem]" style={{ color: 'var(--fg-60)' }}>Viktor E. Frankl</footer>
        </blockquote>
        <p
          className="rise mt-6 max-w-xl text-[0.9375rem] leading-relaxed"
          style={{ ['--d' as string]: '230ms', color: 'var(--fg-60)' } as React.CSSProperties}
        >
          This is also the lived research behind{' '}
          <Link href="/projects/mindset-app" className="underline underline-offset-4 decoration-[var(--accent)] hover:decoration-2" style={{ color: 'var(--fg)' }}>
            MindSet
          </Link>{' '}
          and{' '}
          <Link href="/projects/screens-and-sleep-report" className="underline underline-offset-4 decoration-[var(--accent)] hover:decoration-2" style={{ color: 'var(--fg)' }}>
            Pre-Sleep Screen Restriction
          </Link>
          .
        </p>
      </header>

      <HealthSections sections={SECTIONS} />

      <section className="mt-6 max-w-2xl border-t pt-5 pb-10" style={{ borderColor: 'var(--border-med)' }}>
        <p className={eyebrow} style={{ color: 'var(--fg-eyebrow)' }}>Archive</p>
        <p className="mt-3 text-[0.9375rem] leading-relaxed" style={{ color: 'var(--fg-70)' }}>
          Until October 2026 I followed a different routine: a Push / Pull / Legs split, supplements and a longer sleep plan.
        </p>
        <Link href="/health/archive" className="tap-44 proud-link mt-3 inline-block pb-1 text-[1.0625rem]" style={{ color: 'var(--fg)' }}>
          See the archive <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}
