'use client';

import { compareProjects } from '@/lib/projectOrder';
import { playHover } from '@/lib/sound';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import type { Project } from '@/lib/projects';
import { CATEGORIES } from '@/lib/categoryMeta';
import { splitHighlight } from '@/lib/highlight';
import { eyebrow, smallCaps } from '@/components/typeClasses';

// Artwork shown after dwelling on a row. Projects without artwork simply have
// no preview.
const ART: Record<string, { src: string }> = {
  'screens-and-sleep-report': { src: '/home/sleep-study.jpg' },
  'carbon-capture-model': { src: '/home/carbon-capture-unit.jpg' },
  'mindset-app': { src: '/home/mindset.jpg' },
  anywear: { src: '/projects/anywear-bg.png' },
};


/** How long the pointer has to rest on a row before its preview appears. */
const DWELL_MS = 5000;

const yearOf = (p: Project) => (p.frontmatter.date ?? '').slice(0, 4) || 'Undated';

function Description({ project }: { project: Project }) {
  return (
    <p className="mt-1.5 max-w-xl text-[0.875rem] leading-relaxed" style={{ color: 'var(--fg-70)' }}>
      {splitHighlight(project.frontmatter.descriptionRich ?? project.frontmatter.description).map((part, i) =>
        part.highlight ? (
          <strong key={i} className="font-semibold" style={{ color: 'var(--accent)' }}>
            {part.text}
          </strong>
        ) : (
          part.text
        ),
      )}
    </p>
  );
}

/**
 * The projects ledger: filter by discipline, grouped by year, one dotted-leader
 * row per project. Resting on a row with artwork for five seconds brings up a
 * preview, fixed and centred on the page. Used for the
 * main index (filterable) and for each discipline's own page (not).
 */
export default function ProjectLedger({
  projects,
  filterable = false,
}: {
  projects: Project[];
  filterable?: boolean;
}) {
  const [active, setActive] = useState<string>('All');
  // Bumped on every filter change; keys the list so it plays a short fade.
  // Zero on first render, so nothing animates on page load.
  const [swaps, setSwaps] = useState(0);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  // The slug whose artwork stays mounted while the preview fades out.
  const [lastSlug, setLastSlug] = useState<string | null>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelDwell = () => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    dwellTimer.current = null;
    setPreviewSlug(null);
  };

  useEffect(() => {
    if (previewSlug) setLastSlug(previewSlug);
  }, [previewSlug]);

  // Restore scroll position when returning from a project page.
  useEffect(() => {
    setMounted(true);
    const saved = sessionStorage.getItem('projects-scroll');
    if (saved) {
      requestAnimationFrame(() => window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' }));
      sessionStorage.removeItem('projects-scroll');
    }
    const saveScroll = () => sessionStorage.setItem('projects-scroll', String(window.scrollY));
    window.addEventListener('beforeunload', saveScroll);
    // Next.js client navigation doesn't fire beforeunload, so save on link click too.
    const onLinkClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest('a[href^="/projects/"]')) saveScroll();
    };
    document.addEventListener('click', onLinkClick);
    // Scrolling moves the row out from under a resting pointer without
    // necessarily firing mouseleave, so treat it as leaving.
    const onScroll = () => {
      if (dwellTimer.current) clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
      setPreviewSlug(null);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('beforeunload', saveScroll);
      document.removeEventListener('click', onLinkClick);
      window.removeEventListener('scroll', onScroll);
      if (dwellTimer.current) clearTimeout(dwellTimer.current);
    };
  }, []);

  const published = projects.filter((p) => p.frontmatter.status === 'published');
  const upcoming = projects.filter((p) => p.frontmatter.status === 'upcoming');

  const counts: Record<string, number> = {};
  for (const p of published) {
    const cat = p.frontmatter.category ?? 'Other';
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  const disciplines = CATEGORIES.filter((c) => (counts[c.label] ?? 0) > 0);

  const matches = (p: Project) => active === 'All' || (p.frontmatter.category ?? 'Other') === active;
  const visible = published.filter(matches).sort(compareProjects);
  const inProgress = upcoming.filter(matches);

  const years: [string, Project[]][] = [];
  for (const p of visible) {
    const year = yearOf(p);
    const last = years[years.length - 1];
    if (last && last[0] === year) last[1].push(p);
    else years.push([year, [p]]);
  }

  // Only rows with artwork start the timer; leaving (or focusing away) cancels it.
  // Every project row ticks like one detent of a scroll wheel as the pointer crosses it (mouse only;
  // touch never fires mouseenter). Rows with artwork also start the preview timer; leaving, or
  // focusing away, cancels it.
  const rowProps = (slug: string) => {
    const tick = () => playHover(Math.max(0, visible.findIndex((p) => p.slug === slug)));
    return ART[slug]
      ? {
          onMouseEnter: () => {
            tick();
            cancelDwell();
            dwellTimer.current = setTimeout(() => setPreviewSlug(slug), DWELL_MS);
          },
          onMouseLeave: cancelDwell,
          onFocus: () => {
            cancelDwell();
            dwellTimer.current = setTimeout(() => setPreviewSlug(slug), DWELL_MS);
          },
          onBlur: cancelDwell,
        }
      : { onMouseEnter: tick };
  };

  return (
    <div>
      <div>
        {filterable && (
          <div role="group" aria-label="Filter projects by discipline" className="mb-8 flex flex-wrap gap-x-6 gap-y-3">
            {[{ label: 'All', count: published.length }, ...disciplines.map((c) => ({ label: c.label, count: counts[c.label] }))].map(
              (opt) => {
                const on = active === opt.label;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => { if (opt.label !== active) setSwaps((n) => n + 1); setActive(opt.label); }}
                    className={`tap-44 ledger-filter pb-1 text-[0.9375rem] ${on ? 'proud-link' : ''}`}
                    style={{ color: on ? 'var(--fg)' : 'var(--fg-60)' }}
                  >
                    {opt.label}
                    <span className="ml-1.5 text-[10.5px] tabular-nums" style={{ color: 'var(--fg-45)' }}>
                      {opt.count}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        )}

        {visible.some((p) => p.frontmatter.featured) && (
          <p className={`mb-6 ${smallCaps}`} style={{ color: 'var(--fg-60)' }}>
            <span aria-hidden="true" style={{ color: 'var(--accent)' }}>★</span> Standout projects
          </p>
        )}

        <div key={swaps} className={swaps > 0 ? 'list-swap' : undefined}>
        {inProgress.length > 0 && (
          <section className="grid gap-x-6 border-t pt-5 pb-10 sm:grid-cols-[7rem_1fr]" style={{ borderColor: 'var(--border-med)' }}>
            <h2 className={`${eyebrow} mb-4 flex items-center gap-2 whitespace-nowrap sm:mb-0`} style={{ color: 'var(--accent)' }}>
              <span className="inline-flex h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} aria-hidden="true" />
              In progress
            </h2>
            <ul>
              {inProgress.map((p) => (
                // Not a link: in-progress projects have no write-up page yet.
                <li key={p.slug} className="py-3">
                  <div className="row-wrap flex items-baseline gap-4">
                    <span className="text-[clamp(1.35rem,2.6vw,1.75rem)] leading-tight tracking-[-0.025em]" style={{ color: 'var(--fg)' }}>
                      {p.frontmatter.title}
                    </span>
                    <span className="min-w-6 flex-1 -translate-y-[0.35rem] border-b border-dotted" style={{ borderColor: 'var(--fg-30)' }} aria-hidden="true" />
                    <span className={`flex-shrink-0 whitespace-nowrap text-right ${smallCaps}`} style={{ color: 'var(--fg-60)' }}>
                      {p.frontmatter.category}
                    </span>
                  </div>
                  <Description project={p} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {years.map(([year, items]) => (
          <section key={year} className="grid gap-x-6 border-t pt-5 pb-12 sm:grid-cols-[7rem_1fr]" style={{ borderColor: 'var(--border-med)' }}>
            {/* Big, quiet numerals: they set the rhythm of the page without
                competing with the titles. */}
            <h2
              className="mb-3 text-[clamp(1.6rem,2.6vw,2.25rem)] font-medium leading-none tracking-[-0.04em] tabular-nums sm:sticky sm:top-24 sm:mb-0 sm:self-start"
              style={{ color: 'var(--fg-45)' }}
            >
              {year}
            </h2>
            <ul>
              {items.map((p) => (
                <li key={p.slug}>
                  <Link href={`/projects/${p.slug}`} className="index-row block py-3.5" {...rowProps(p.slug)}>
                    <span className="row-wrap flex items-baseline gap-4">
                      <span className="index-label text-[clamp(1.35rem,2.6vw,1.75rem)] leading-tight tracking-[-0.025em]" style={{ color: 'var(--fg)' }}>
                        {p.frontmatter.title}
                        {p.frontmatter.featured && (
                          <span role="img" aria-label="Standout project" className="ml-2 align-[0.12em] text-[0.55em]" style={{ color: 'var(--accent)' }}>
                            ★
                          </span>
                        )}
                      </span>
                      <span className="index-leader min-w-6 flex-1 -translate-y-[0.35rem]" aria-hidden="true" />
                      <span className={`flex-shrink-0 whitespace-nowrap text-right ${smallCaps}`} style={{ color: 'var(--fg-60)' }}>
                        {p.frontmatter.artifactType ?? p.frontmatter.category}
                      </span>
                    </span>
                    <Description project={p} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        </div>
      </div>

      {/* Portalled to <body>: the page's entrance animation makes its wrapper
          the containing block for `fixed` children, which would push this
          off-centre. lg:left offsets by the sidebar so it centres on the
          content, not the whole window. */}
      {mounted &&
        createPortal(
          <div
            aria-hidden="true"
            className="ledger-preview pointer-events-none fixed left-1/2 top-1/2 z-40 w-[min(320px,70vw)] lg:left-[calc(50%+125px)]"
            style={{
              transform: `translate(-50%, -50%) scale(${previewSlug ? 1 : 0.97})`,
              opacity: previewSlug ? 1 : 0,
              transition: 'opacity 0.3s ease, transform 0.3s var(--ease-out)',
            }}
          >
            <div className="relative aspect-[4/5] overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-med)', boxShadow: '0 24px 64px -16px rgba(0,0,0,0.7)' }}>
              {/* Only the artwork being (or last) shown is mounted. All four sat here before, hidden at
                  opacity 0, but they are inside the viewport so the browser downloaded every one on page load. */}
              {lastSlug && ART[lastSlug] && (
                <Image
                  key={lastSlug}
                  src={ART[lastSlug].src}
                  alt=""
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
