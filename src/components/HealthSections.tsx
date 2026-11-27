import type { ReactNode } from 'react';
import { eyebrow } from '@/components/typeClasses';

export interface HealthSection {
  id: string;
  title: string;
  /** Prose paragraphs; the first is set larger as the lead. */
  body: ReactNode[];
  /** Quick facts, shown as a dotted-leader list under the prose. */
  facts?: [string, ReactNode][];
  /** Facts split under small labels (for example "Doing now" and "On pause"). */
  factGroups?: { label: string; facts: [string, ReactNode][] }[];
  /** A small, quiet line after everything else in the section. */
  note?: ReactNode;
}

function Facts({ facts, spaced }: { facts: [string, ReactNode][]; spaced: boolean }) {
  return (
    <dl className={`max-w-2xl ${spaced ? 'mt-8' : ''}`}>
      {facts.map(([label, value]) => (
        <div key={label} className="row-wrap flex items-baseline gap-4 py-2.5">
          <dt className="text-[1.0625rem] tracking-[-0.01em]" style={{ color: 'var(--fg)' }}>
            {label}
          </dt>
          <span className="min-w-6 flex-1 -translate-y-[0.3rem] border-b border-dotted" style={{ borderColor: 'var(--fg-30)' }} aria-hidden="true" />
          <dd className="text-right text-[0.9375rem]" style={{ color: 'var(--fg-70)' }}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The sticky section rail plus the numbered sections. Shared by /health and /health/archive. */
export default function HealthSections({ sections, archived = false }: { sections: HealthSection[]; archived?: boolean }) {
  // Petrol means "current" on this site. Archived versions use the quiet neutral instead, and dashed rules
  // (the print convention for "kept, not live"), so they never pass for the routine I follow now.
  const numeral = archived ? 'var(--fg-45)' : 'var(--accent)';
  return (
    <div>
      <div className="lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-14">
        {/* Section rail: sticky on wide screens, so you can jump around the protocol. */}
        <nav aria-label="Sections" className="hidden self-start lg:sticky lg:top-28 lg:block">
          <p className={`${eyebrow} mb-4`} style={{ color: 'var(--fg-eyebrow)' }}>
            On this page
          </p>
          <ul className="space-y-2.5">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="rail-link flex items-baseline gap-3 text-[0.9375rem]" style={{ color: 'var(--fg-60)' }}>
                  <span className="text-[10.5px] tabular-nums" style={{ color: numeral }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          {sections.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-heading`}
              className={`scroll-mt-28 border-t pb-14 pt-5 ${archived ? 'border-dashed' : ''}`}
              style={{ borderColor: 'var(--border-med)' }}
            >
              <div className="mb-6 flex items-baseline gap-4">
                <span
                  className="text-[clamp(1.6rem,2.6vw,2.25rem)] font-medium leading-none tracking-[-0.04em] tabular-nums"
                  style={{ color: numeral }}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2
                  id={`${s.id}-heading`}
                  className="text-[clamp(1.9rem,3.6vw,2.6rem)] font-medium leading-none tracking-[-0.03em]"
                  style={{ color: 'var(--fg)' }}
                >
                  {s.title}
                </h2>
              </div>

              {s.body.length > 0 && (
                <div className="max-w-2xl space-y-4">
                  {s.body.map((para, j) => (
                    <p
                      key={j}
                      className={j === 0 ? 'text-[clamp(1.1rem,1.8vw,1.25rem)] leading-[1.55] tracking-[-0.01em]' : 'text-[0.9375rem] leading-[1.8]'}
                      style={{ color: j === 0 ? 'var(--fg)' : 'var(--fg-70)' }}
                    >
                      {para}
                    </p>
                  ))}
                </div>
              )}

              {s.facts && <Facts facts={s.facts} spaced={s.body.length > 0} />}

              {s.factGroups?.map((g, k) => (
                <div key={g.label} className={k === 0 && s.body.length === 0 ? '' : 'mt-8'}>
                  <p className={eyebrow} style={{ color: 'var(--fg-eyebrow)' }}>{g.label}</p>
                  <Facts facts={g.facts} spaced={false} />
                </div>
              ))}

              {s.note && (
                <p className="mt-6 max-w-2xl text-[0.875rem] leading-relaxed" style={{ color: 'var(--fg-60)' }}>
                  {s.note}
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
