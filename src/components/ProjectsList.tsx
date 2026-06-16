'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Project } from '@/lib/projects';
import {
  FaMobileAlt, FaFlask, FaFilm, FaCog,
  FaFolder, FaLightbulb, FaStar, FaChalkboard,
} from 'react-icons/fa';

const FEATURED_SLUGS = ['mindset-app', 'anywear', 'insusense'];

type CatMeta = { label: string; icon: React.ElementType; color: string; bg: string; order: number };

const CATEGORY_META: Record<string, CatMeta> = {
  'Creative':    { label: 'Creative',    icon: FaLightbulb,  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  order: 1 },
  'Product':     { label: 'Product',     icon: FaMobileAlt,  color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', order: 2 },
  'Research':    { label: 'Research',    icon: FaFlask,      color: '#34d399', bg: 'rgba(52,211,153,0.12)',  order: 3 },
  'Pitch Deck':  { label: 'Pitch Deck', icon: FaChalkboard, color: '#818cf8', bg: 'rgba(129,140,248,0.12)', order: 4 },
  'Film':        { label: 'Film',        icon: FaFilm,       color: '#f87171', bg: 'rgba(248,113,113,0.12)', order: 5 },
  'Engineering': { label: 'Engineering', icon: FaCog,        color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  order: 6 },
};

// Darkened versions for light mode (WCAG contrast on light bg)
const LIGHT_COLORS: Record<string, string> = {
  'Creative':    '#92660a',
  'Product':     '#6d28d9',
  'Research':    '#047857',
  'Pitch Deck':  '#3730a3',
  'Film':        '#b91c1c',
  'Engineering': '#c2410c',
};

function getCatMeta(cat: string): CatMeta {
  return CATEGORY_META[cat] ?? { label: cat, icon: FaFolder, color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.08)', order: 99 };
}

function ProjectCard({ project, featured = false }: { project: Project; featured?: boolean }) {
  const cat = project.frontmatter.category ?? 'Other';
  const meta = getCatMeta(cat);
  const Icon = meta.icon;

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group flex items-center gap-4 border rounded-xl p-5 transition-all duration-200 hover:border-white/30 hover:bg-white/4 hover:scale-[1.01]"
      style={{
        borderColor: featured ? 'rgba(251,191,36,0.25)' : 'var(--border-9)',
        background: featured ? 'rgba(251,191,36,0.04)' : 'var(--card-bg)',
      }}
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
        style={{ background: meta.bg }}
      >
        <Icon size={20} style={{ color: meta.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-poppins font-semibold text-base group-hover:text-white transition-colors" style={{ color: 'var(--fg)' }}>
            {project.frontmatter.title}
          </h3>
          {featured && (
            <FaStar size={10} style={{ color: '#fbbf24', flexShrink: 0 }} />
          )}
        </div>
        <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--fg-60)' }}>
          {project.frontmatter.description}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 hidden sm:flex">
        <span className="text-xs" style={{ color: 'var(--fg-30)' }}>{project.frontmatter.date}</span>
        <span className="text-xs group-hover:opacity-60 transition-opacity" style={{ color: 'var(--fg-dimmer)' }}>View →</span>
      </div>
    </Link>
  );
}

export default function ProjectsList({ projects }: { projects: Project[] }) {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [isLight, setIsLight] = useState(false);

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

  useEffect(() => {
    const update = () => setIsLight(document.documentElement.classList.contains('light'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const resolveColor = (cat: string, fallback: string) =>
    isLight ? (LIGHT_COLORS[cat] ?? fallback) : fallback;

  const published = projects.filter((p) => p.frontmatter.status === 'published');
  const upcoming  = projects.filter((p) => p.frontmatter.status === 'upcoming');

  const featured    = FEATURED_SLUGS.map((s) => published.find((p) => p.slug === s)).filter(Boolean) as Project[];
  const nonFeatured = published.filter((p) => !FEATURED_SLUGS.includes(p.slug));

  // Derive filter list from non-featured projects
  const allCategories = [...new Set(published.map((p) => p.frontmatter.category ?? 'Other'))].sort(
    (a, b) => (CATEGORY_META[a]?.order ?? 99) - (CATEGORY_META[b]?.order ?? 99)
  );
  const filters = ['All', ...allCategories];

  // When filtering, show matching published projects (including featured ones)
  const isFiltered = activeFilter !== 'All';
  const filteredProjects = isFiltered
    ? published.filter((p) => p.frontmatter.category === activeFilter)
    : nonFeatured;

  // Group filtered non-featured projects by category, sorted by date desc
  const grouped: Record<string, Project[]> = {};
  for (const p of filteredProjects) {
    const cat = p.frontmatter.category ?? 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => (b.frontmatter.date ?? '').localeCompare(a.frontmatter.date ?? ''));
  }
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => (CATEGORY_META[a]?.order ?? 99) - (CATEGORY_META[b]?.order ?? 99)
  );

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-poppins font-semibold text-4xl mb-2 tracking-tight" style={{ color: 'var(--fg)' }}>Projects</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--fg-dim)' }}>Things I&apos;ve built, written, or made.</p>

      {/* ── Featured ── */}
      {!isFiltered && featured.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.15)' }}>
              <FaStar size={11} style={{ color: resolveColor('Creative', '#fbbf24') }} />
            </div>
            <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: resolveColor('Creative', '#fbbf24') }}>
              Featured
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {featured.map((p) => {
              const cat = p.frontmatter.category ?? 'Other';
              const meta = getCatMeta(cat);
              const Icon = meta.icon;
              return (
                <Link
                  key={p.slug}
                  href={`/projects/${p.slug}`}
                  className="group flex flex-col gap-3 border rounded-xl p-4 transition-all duration-200 hover:border-yellow-400/40 hover:bg-yellow-400/4 hover:scale-[1.02] sm:min-h-[160px]"
                  style={{ borderColor: 'rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.03)' }}
                >
                  {/* Mobile: row layout. Desktop: column layout */}
                  <div className="flex items-start gap-3 sm:flex-col sm:gap-0">
                    <div className="flex items-center justify-between sm:w-full sm:mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ background: meta.bg }}>
                        <Icon size={18} style={{ color: meta.color }} />
                      </div>
                      <FaStar size={9} className="hidden sm:block" style={{ color: '#fbbf24', opacity: 0.7 }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-poppins font-semibold text-sm leading-snug mb-1 sm:mb-2 group-hover:text-white transition-colors" style={{ color: 'var(--fg)' }}>
                        {p.frontmatter.title}
                      </h3>
                      <p className="text-xs leading-relaxed line-clamp-2 sm:line-clamp-3" style={{ color: 'var(--fg-45)' }}>
                        {p.frontmatter.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs mt-1 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--fg-dimmer)' }}>View →</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── In Progress (above filters, under featured) ── */}
      {upcoming.length > 0 && !isFiltered && (
        <section className="mb-8">
          <div
            className="rounded-xl p-5 border"
            style={{
              borderColor: 'rgba(52,211,153,0.3)',
              background: 'rgba(52,211,153,0.05)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: '#34d399' }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: '#34d399' }} />
              </span>
              <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: isLight ? '#047857' : '#34d399' }}>
                In Progress
              </h2>
            </div>
            <div className="space-y-3">
              {upcoming.map((p) => {
                const cat = p.frontmatter.category ?? 'Other';
                const meta = getCatMeta(cat);
                const Icon = meta.icon;
                return (
                  <div
                    key={p.slug}
                    className="flex items-center gap-4 rounded-lg p-4 transition-all duration-200 hover:bg-white/5 hover:brightness-95"
                    style={{ background: 'var(--card-bg)' }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                      <Icon size={17} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-poppins font-semibold text-white text-sm mb-0.5">{p.frontmatter.title}</h3>
                      <p className="text-white/50 text-xs leading-relaxed">{p.frontmatter.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Filter pills ── */}
      <div className="flex flex-wrap gap-2 mb-8">
        {filters.map((f) => {
          const active = activeFilter === f;
          const meta = f === 'All' ? null : getCatMeta(f);
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-150 hover:opacity-90"
              style={{
                background: active
                  ? (meta?.bg ?? 'var(--hover-bg)')
                  : 'var(--card-bg-hover)',
                color: active ? (f !== 'All' ? resolveColor(f, meta?.color ?? 'var(--fg)') : 'var(--fg)') : 'var(--fg-45)',
                border: `1px solid ${active ? (meta ? resolveColor(f, meta.color) + '55' : 'var(--border-med)') : 'var(--border-8)'}`,
              }}
            >
              {meta && <meta.icon size={10} />}
              {f}
            </button>
          );
        })}
      </div>

      {/* ── Category groups ── */}
      {sortedCategories.map((cat) => {
        const meta = getCatMeta(cat);
        const Icon = meta.icon;
        const catColor = resolveColor(cat, meta.color);
        return (
          <section key={cat} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                <Icon size={14} style={{ color: catColor }} />
              </div>
              <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: catColor }}>
                {cat}
              </h2>
            </div>
            <div className="space-y-3">
              {grouped[cat].map((p) => <ProjectCard key={p.slug} project={p} />)}
            </div>
          </section>
        );
      })}

    </div>
  );
}
