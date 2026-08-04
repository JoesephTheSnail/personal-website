'use client';

import { useEffect } from 'react';
import type { Project } from '@/lib/projects';
import { getCategoryMeta, CATEGORIES } from '@/lib/categoryMeta';
import PhotoTile from './PhotoTile';

const FEATURED_SLUGS = ['mindset-app', 'anywear', 'screens-and-sleep-report'];

// A genuine, quantifiable standout result, surfaced once on the category
// subtitle — deliberately not applied to every category. "3 projects" is
// neutral; these are the ones that have actually earned a stronger claim.
const CATEGORY_HIGHLIGHT: Record<string, string> = {
  Creative: '1st place at DragonzDen',
  Research: '$2.21/unit built',
  'Pitch Deck': 'presented to Meta',
};

// A faded photo behind the tile instead of the flat gradient wash — keyed
// by project slug for pinned tiles, or category slug for subject tiles.
const TILE_BG_IMAGES: Record<string, string> = {
  'pitch-deck': 'https://www.unicef.org/guineabissau/sites/unicef.org.guineabissau/files/styles/hero_extended/public/IMG_3644.JPG.webp?itok=cuAwL9s3',
  anywear: '/projects/anywear-bg.png',
};

export default function ProjectsList({ projects }: { projects: Project[] }) {
  // Restore scroll position when returning from a project page
  useEffect(() => {
    const saved = sessionStorage.getItem('projects-scroll');
    if (saved) {
      requestAnimationFrame(() => window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' }));
      sessionStorage.removeItem('projects-scroll');
    }

    const saveScroll = () => sessionStorage.setItem('projects-scroll', String(window.scrollY));
    window.addEventListener('beforeunload', saveScroll);
    // Also save when clicking any project link (Next.js SPA navigation doesn't trigger beforeunload)
    const onLinkClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest('a[href^="/projects/"]')) {
        saveScroll();
      }
    };
    document.addEventListener('click', onLinkClick);
    return () => {
      window.removeEventListener('beforeunload', saveScroll);
      document.removeEventListener('click', onLinkClick);
    };
  }, []);

  const published = projects.filter((p) => p.frontmatter.status === 'published');
  const upcoming  = projects.filter((p) => p.frontmatter.status === 'upcoming');

  const featured = FEATURED_SLUGS.map((s) => published.find((p) => p.slug === s)).filter(Boolean) as Project[];

  const counts: Record<string, number> = {};
  for (const p of published) {
    const cat = p.frontmatter.category ?? 'Other';
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  const subjectCats = CATEGORIES.filter((c) => (counts[c.label] ?? 0) > 0).sort((a, b) => a.order - b.order);

  const pinnedTiles = [
    ...featured.map((p, i) => {
      const meta = getCategoryMeta(p.frontmatter.category ?? 'Other');
      return (
        <PhotoTile
          key={p.slug}
          href={`/projects/${p.slug}`}
          color={meta.color}
          lightColor={meta.lightColor}
          size="wide"
          icon={meta.icon}
          title={p.frontmatter.title}
          subtitle={p.frontmatter.description}
          featured
          meta={p.frontmatter.artifactType ? `${p.frontmatter.date} · ${p.frontmatter.artifactType}` : p.frontmatter.date}
          chip={meta.label}
          hoverIndex={i}
          bgImage={TILE_BG_IMAGES[p.slug]}
        />
      );
    }),
    ...upcoming.map((p, i) => {
      const meta = getCategoryMeta(p.frontmatter.category ?? 'Other');
      return (
        <PhotoTile
          key={p.slug}
          color={meta.color}
          lightColor={meta.lightColor}
          size="wide"
          icon={meta.icon}
          title={p.frontmatter.title}
          subtitle={p.frontmatter.description}
          // "Upcoming" means still in progress, not a finished write-up —
          // softened, with a live status chip instead of a date.
          inProgress
          chip={meta.label}
          hoverIndex={featured.length + i}
        />
      );
    }),
  ];

  const pinnedCount = featured.length + upcoming.length;
  const subjectTiles = subjectCats.map((c, i) => {
    const count = counts[c.label] ?? 0;
    // The first 4 subjects flank the pinned tiles (see `ordered` below);
    // whatever's left closes out the grid. Sizing that trailing pair
    // "wide" instead of "sm" is what makes the closing row sum to a full
    // 4 columns instead of leaving empty space next to it.
    const size = i >= 4 ? 'wide' : 'sm';
    return (
      <PhotoTile
        key={c.slug}
        href={`/projects/${c.slug}`}
        color={c.color}
        lightColor={c.lightColor}
        size={size}
        icon={c.icon}
        title={c.label}
        subtitle={CATEGORY_HIGHLIGHT[c.label] ? `${count} project${count === 1 ? '' : 's'} · ${CATEGORY_HIGHLIGHT[c.label]}` : `${count} project${count === 1 ? '' : 's'}`}
        motif={c.motif}
        hoverIndex={pinnedCount + i}
        bgImage={TILE_BG_IMAGES[c.slug]}
      />
    );
  });

  // A single hand-ordered sequence — pinned tiles flanked by subject tiles
  // — with grid-flow-row-dense doing the packing. Column count changes per
  // breakpoint (2 on tablet, 4 on desktop), and a fixed row layout only
  // sums to a gap-free row at exactly 4 columns. Dense backfill handles
  // every column count itself: whichever later item first fits a gap gets
  // pulled back to fill it, so the same order reflows cleanly at 1, 2, or
  // 4 columns. Row-span is never used (see PhotoTile) — only widths vary —
  // which is what makes dense packing reliable here.
  // Pre-Sleep (pinnedTiles[2]) and Engineering (subjectTiles[5]) are swapped
  // from their natural slots. Both are wide, so they exchange cleanly without
  // disturbing any row's column sum.
  const ordered = [
    subjectTiles[0], pinnedTiles[0], subjectTiles[1],
    pinnedTiles[1], subjectTiles[5],
    subjectTiles[2], pinnedTiles[3], subjectTiles[3],
    subjectTiles[4], pinnedTiles[2], subjectTiles[6],
  ].filter(Boolean);

  return (
    <div className="max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto">
      <div className="flex items-center gap-2.5 mb-3">
        <span aria-hidden="true" className="block flex-shrink-0" style={{ width: 18, height: 1, background: 'var(--fg-30)' }} />
        <span className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.16em', color: 'var(--fg-eyebrow)' }}>
          Selected work
        </span>
      </div>

      <h1
        className="font-poppins font-semibold text-[2.75rem] leading-[1.05] mb-3"
        style={{ color: 'var(--fg)', letterSpacing: '-0.028em' }}
      >
        Projects
      </h1>
      <p className="text-[0.9375rem] leading-relaxed mb-9 max-w-md" style={{ color: 'var(--fg-45)' }}>
        Things I&apos;ve built, written, or made —{' '}
        <span style={{ color: 'var(--fg-60)' }}>{published.length} projects</span> across{' '}
        <span style={{ color: 'var(--fg-60)' }}>{subjectCats.length} disciplines</span>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 grid-flow-row-dense auto-rows-auto sm:auto-rows-[204px] lg:auto-rows-[224px] gap-3">
        {ordered}
      </div>
    </div>
  );
}
