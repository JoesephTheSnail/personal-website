import { getAllProjects } from '@/lib/projects';
import { pageMetadata } from '@/lib/seo';
import ProjectLedger from '@/components/ProjectLedger';
import { CATEGORIES } from '@/lib/categoryMeta';
import { eyebrow } from '@/components/typeClasses';

export const metadata = pageMetadata('/projects', 'Projects', 'Projects by Arnav Chandra: apps, pitch decks, and experiments in health and technology, including MindSet.');


export default function ProjectsPage() {
  // The list only needs each project's frontmatter, so don't ship every
  // write-up (and its image paths) to the browser.
  const projects = getAllProjects().map((p) => ({ ...p, content: '' }));
  const published = projects.filter((p) => p.frontmatter.status === 'published');
  const disciplines = CATEGORIES.filter((c) => published.some((p) => p.frontmatter.category === c.label)).length;

  return (
    <div className="max-w-5xl mx-auto">
      <header className="relative mb-12 sm:mb-16">
        <p className={`rise ${eyebrow}`} style={{ color: 'var(--fg-eyebrow)' }}>
          Selected work
        </p>
        <h1
          className="rise mt-3 text-[clamp(2.25rem,5.2vw,3.75rem)] font-medium leading-[0.95] tracking-[-0.04em]"
          style={{ ['--d' as string]: '80ms', color: 'var(--fg)' } as React.CSSProperties}
        >
          Projects
        </h1>
        <p
          className="rise mt-4 text-[clamp(1.05rem,1.8vw,1.25rem)] tracking-tight"
          style={{ ['--d' as string]: '160ms', color: 'var(--fg-60)' } as React.CSSProperties}
        >
          Things I&apos;ve built, written, and made.
        </p>
        <p
          className="rise mt-6 text-[10.5px] uppercase tracking-[0.14em]"
          style={{ ['--d' as string]: '230ms', color: 'var(--fg-60)' } as React.CSSProperties}
        >
          {published.length} projects across {disciplines} disciplines
        </p>
      </header>

      <div className="rise" style={{ ['--d' as string]: '300ms' } as React.CSSProperties}>
        <ProjectLedger projects={projects} filterable />
      </div>
    </div>
  );
}
