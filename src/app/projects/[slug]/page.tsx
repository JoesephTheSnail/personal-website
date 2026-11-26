import { getAllProjects } from '@/lib/projects';
import { CATEGORIES, getCategoryBySlug, getCategoryByLabel } from '@/lib/categoryMeta';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Image from 'next/image';
import Link from 'next/link';
import ContactActions from '@/components/ContactActions';
import { notFound } from 'next/navigation';
import TruckButton from '@/components/TruckButton';
import StarButton from '@/components/StarButton';
import { compareProjects, nextOrTop } from '@/lib/projectOrder';
import { STAR_BUTTONS } from '@/lib/starButtons';
import { FaFileLines, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import ProjectLedger from '@/components/ProjectLedger';
import BackLink from '@/components/BackLink';
import EmbedFrame from '@/components/EmbedFrame';

interface Props { params: Promise<{ slug: string }>; }

// Write-up images load lazily. Without this, React hints the browser to preload them as soon as the page's
// data is prefetched, so /projects was downloading two photos nobody had asked for yet.
const MDX_COMPONENTS = {
  // eslint-disable-next-line @next/next/no-img-element
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ''} loading="lazy" decoding="async" />,
};

export async function generateStaticParams() {
  const projectParams = getAllProjects().map((p) => ({ slug: p.slug }));
  const categoryParams = CATEGORIES.map((c) => ({ slug: c.slug }));
  return [...projectParams, ...categoryParams];
}

// Share images come from opengraph-image.tsx / twitter-image.tsx next to this file. File-based
// images override config, so no `images` are listed here.

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;

  const category = getCategoryBySlug(slug);
  if (category) {
    const url = `https://arnavchandra.com/projects/${slug}`;
    const title = `${category.label} projects`;
    const names = getAllProjects()
      .filter((p) => p.frontmatter.status === 'published' && p.frontmatter.category === category.label)
      .map((p) => p.frontmatter.title);
    const description = `${category.label} projects by Arnav Chandra, a Toronto student and builder: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ' and more' : ''}.`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title: `${title} | Arnav Chandra`, description, url, type: 'website', siteName: 'Arnav Chandra' },
      twitter: { card: 'summary_large_image', title: `${title} | Arnav Chandra`, description },
    };
  }

  const project = getAllProjects().find((p) => p.slug === slug);
  // Unknown slug: the page itself calls notFound(), so describe it as the 404 it is.
  if (!project) return { title: 'Page not found', robots: { index: false, follow: true } };

  const pageTitle = project.frontmatter.seoTitle ?? project.frontmatter.title;
  const fullTitle = `${pageTitle} | Arnav Chandra`;
  const description = project.frontmatter.description;
  const url = `https://arnavchandra.com/projects/${slug}`;

  return {
    title: pageTitle,
    description,
    alternates: { canonical: url },
    openGraph: { title: fullTitle, description, url, type: 'article', siteName: 'Arnav Chandra' },
    twitter: { card: 'summary_large_image', title: fullTitle, description },
  };
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getGoogleDriveId(url: string): string | null {
  const m = url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function isPdf(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf');
}

function isEmbeddable(url: string): boolean {
  return getYouTubeId(url) !== null || getGoogleDriveId(url) !== null || isPdf(url) || (url.includes('figma.com') && !url.includes('placeholder'));
}

function MediaEmbed({ url, label }: { url: string; label: string }) {
  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <div className="mb-4">
        <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: 'var(--fg-dim)' }}>{label}</p>
        <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
          <EmbedFrame
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${ytId}`}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            fallbackHref={url}
          />
        </div>
      </div>
    );
  }

  const driveId = getGoogleDriveId(url);
  if (driveId) {
    return (
      <div className="mb-4">
        <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: 'var(--fg-dim)' }}>{label}</p>
        <div className="relative w-full rounded-xl overflow-hidden border" style={{ paddingBottom: '56.25%', borderColor: 'var(--border-8)' }}>
          <EmbedFrame
            className="absolute inset-0 w-full h-full"
            src={`https://drive.google.com/file/d/${driveId}/preview`}
            title={label}
            allow="autoplay"
            allowFullScreen
            fallbackHref={url}
          />
        </div>
      </div>
    );
  }

  if (isPdf(url)) {
    // A live PDF viewer drags in the browser's own toolbar/UI chrome,
    // which never matches the site. Instead: a static cover-page preview
    // (rendered once via pdftoppm, convention is `<name>-cover.png` next
    // to `<name>.pdf`) styled as a document card, linking out to the
    // actual PDF in a new tab.
    const coverSrc = url.replace(/\.pdf$/i, '-cover.png');
    return (
      <div className="mb-4">
        <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: 'var(--fg-dim)' }}>{label}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 sm:gap-5 rounded-xl border p-4 sm:p-5 transition-[border-color,background-color] duration-200 hover:border-white/30 hover:bg-white/4"
          style={{ borderColor: 'var(--border-8)', background: 'var(--card-bg)' }}
        >
          <div
            className="relative flex-shrink-0 rounded-lg overflow-hidden border shadow-lg transition-transform duration-200 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.02]"
            style={{ width: 84, aspectRatio: '17 / 22', borderColor: 'var(--border-med)' }}
          >
            <Image src={coverSrc} alt={`Cover page of ${label}`} fill className="object-cover" sizes="84px" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FaFileLines size={14} style={{ color: 'var(--fg-dim)' }} />
              <span className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>{label}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--fg-dim)' }}>PDF Report · Opens in a new tab</p>
          </div>
          <FaArrowUpRightFromSquare
            size={13}
            className="flex-shrink-0 opacity-40 group-hover:opacity-80 transition-opacity"
            style={{ color: 'var(--fg-dim)' }}
          />
        </a>
      </div>
    );
  }

  const isFigmaProto = url.includes('figma.com/proto');
  const isFigmaDesign = url.includes('figma.com') && !isFigmaProto && !url.includes('placeholder');
  if (isFigmaProto) {
    return (
      <div className="mb-4">
        <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: 'var(--fg-dim)' }}>{label}</p>
        <div className="flex justify-center">
          <div className="rounded-xl overflow-hidden border w-full" style={{ height: 'min(700px, 80vh)', borderColor: 'var(--border-8)' }}>
            <EmbedFrame
              className="w-full h-full"
              src={`https://www.figma.com/embed?embed_host=personal-site&url=${encodeURIComponent(url)}`}
              title={label}
              allowFullScreen
              fallbackHref={url}
            />
          </div>
        </div>
      </div>
    );
  }
  if (isFigmaDesign) {
    return (
      <div className="mb-4">
        <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: 'var(--fg-dim)' }}>{label}</p>
        <div className="relative w-full rounded-xl overflow-hidden border" style={{ paddingBottom: '56.25%', borderColor: 'var(--border-8)' }}>
          <EmbedFrame
            className="absolute inset-0 w-full h-full"
            src={`https://www.figma.com/embed?embed_host=personal-site&url=${encodeURIComponent(url)}`}
            title={label}
            allowFullScreen
            fallbackHref={url}
          />
        </div>
      </div>
    );
  }

  // Fallback: button link
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="tap-44 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 mb-3 mr-3"
      style={{ background: 'var(--hover-bg)', border: '1px solid var(--border-med)', color: 'var(--fg)' }}
    >
      {label} ↗
    </a>
  );
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;

  // Category browsing pages (/projects/research, /projects/pitch-deck, …)
  // share this same [slug] segment as individual project pages — Next.js
  // can't have two dynamic segments at the same path level, so a known
  // category slug is resolved here first, before falling through to the
  // project lookup below.
  const category = getCategoryBySlug(slug);
  if (category) {
    const categoryProjects = getAllProjects()
      .filter((p) => p.frontmatter.status === 'published' && p.frontmatter.category === category.label)
      .sort((a, b) => (b.frontmatter.date ?? '').localeCompare(a.frontmatter.date ?? ''));
    if (categoryProjects.length === 0) notFound();

    return (
      <div className="max-w-5xl mx-auto">
        <BackLink fallbackHref="/projects" label="Back to Projects" />

        <header className="relative mb-12 sm:mb-16">
          <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--fg-eyebrow)' }}>
            Discipline
          </p>
          <h1
            className="mt-3 text-[clamp(3rem,8vw,5.75rem)] font-medium leading-[0.92] tracking-[-0.045em]"
            style={{ color: 'var(--fg)' }}
          >
            {category.label}
          </h1>
          <p className="mt-6 text-[10.5px] uppercase tracking-[0.14em]" style={{ color: 'var(--fg-60)' }}>
            {categoryProjects.length} project{categoryProjects.length === 1 ? '' : 's'}
          </p>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[-0.12em] right-0 hidden select-none text-[clamp(9rem,17vw,15rem)] font-medium leading-[0.8] tracking-[-0.06em] lg:block"
            style={{ color: 'transparent', WebkitTextStroke: '1px var(--fg-30)' }}
          >
            {categoryProjects.length}
          </span>
        </header>

        <ProjectLedger projects={categoryProjects.map((p) => ({ ...p, content: '' }))} />
      </div>
    );
  }

  const project = getAllProjects().find((p) => p.slug === slug);
  if (!project) notFound();

  const { title, date, description, links, category: categoryLabel, artifactType, tools, demoHref, demoLabel, demoNote } = project.frontmatter;
  const star = STAR_BUTTONS[slug];
  const starLink = star ? links?.find((l) => l.label === star.linkLabel) : undefined;
  // Drop the star button's own link from the list unless it is a live embed (a PDF card just repeats the button).
  const mediaLinks = starLink && (!isEmbeddable(starLink.url) || isPdf(starLink.url)) ? links?.filter((l) => l !== starLink) : links;

  // The write-up ends with a "**Outcome:** ..." line. It is the sentence a
  // reader most wants, so it is shown under the description instead of at the
  // very bottom. Same words, moved, not rewritten; projects without one are
  // unchanged.
  const OUTCOME_LINE = /^\*\*Outcome:\*\*[ \t]*(.+)$/m;
  const outcome = project.content.match(OUTCOME_LINE)?.[1]?.trim();
  const body = outcome ? project.content.replace(OUTCOME_LINE, '').replace(/\n{3,}/g, '\n\n') : project.content;
  // Falls back to the project's own category page (not the full grid) when
  // there's no in-site history to go back to — a shared/direct link to a
  // Robotics writeup should land back on Engineering, not the top grid.
  const parentCategory = categoryLabel ? getCategoryByLabel(categoryLabel) : undefined;
  const backHref = parentCategory ? `/projects/${parentCategory.slug}` : '/projects';

  // Where to go next: the following project in the list, in the same order as /projects (newest first).
  // It runs down the list once; after the last project it points back to the first ("Back to the top").
  const publishedProjects = getAllProjects().filter((p) => p.frontmatter.status === 'published').sort(compareProjects);
  const next = nextOrTop(publishedProjects, slug);
  const nextProject = next?.project;

  // Structured data: what this page is, who made it, and where it sits in the site.
  const pageUrl = `https://arnavchandra.com/projects/${slug}`;
  const crumbs = [
    { name: 'Home', url: 'https://arnavchandra.com' },
    { name: 'Projects', url: 'https://arnavchandra.com/projects' },
    ...(parentCategory ? [{ name: parentCategory.label, url: `https://arnavchandra.com/projects/${parentCategory.slug}` }] : []),
    { name: title, url: pageUrl },
  ];
  const projectJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CreativeWork',
        '@id': `${pageUrl}#work`,
        name: title,
        description,
        url: pageUrl,
        author: { '@type': 'Person', name: 'Arnav Chandra', url: 'https://arnavchandra.com' },
        genre: artifactType ?? categoryLabel,
        ...(date && /^\d{4}(-\d{2})?$/.test(date) ? { dateCreated: date } : {}),
        ...(tools && tools.length ? { keywords: tools.join(', ') } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      },
    ],
  };

  return (
    <div className="max-w-3xl mx-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(projectJsonLd).replace(/</g, '\\u003c') }} />
      <BackLink fallbackHref={backHref} label="Back to Projects" />

      {/* Header */}
      <header className="mb-10 sm:mb-12">
        <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--fg-eyebrow)' }}>
          {[artifactType ?? categoryLabel, date].filter(Boolean).join(' / ')}
        </p>
        <h1
          className="mt-3 text-[clamp(2.25rem,5.5vw,3.75rem)] font-medium leading-[0.98] tracking-[-0.04em]"
          style={{ color: 'var(--fg)' }}
        >
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-[clamp(1.1rem,1.8vw,1.3rem)] leading-[1.5]" style={{ color: 'var(--fg-70)' }}>
          {description}
        </p>
        {outcome && (
          <div className="mt-8 max-w-2xl border-t pt-4" style={{ borderColor: 'var(--border-med)' }}>
            <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--fg-eyebrow)' }}>
              Outcome
            </p>
            <div className="mt-2 text-[1rem] leading-[1.6]" style={{ color: 'var(--fg)' }}>
              <MDXRemote source={outcome} components={{ p: ({ children }) => <>{children}</> }} />
            </div>
          </div>
        )}
      </header>

      {/* Interactive demo: the one thing on the page worth a primary button */}
      {demoHref && (
        <div className="mb-10">
          <TruckButton href={demoHref}>{demoLabel ?? 'Open the demo'}</TruckButton>
          {demoNote && (
            <p className="mt-2.5 text-xs" style={{ color: 'var(--fg-dim)' }}>
              {demoNote}
            </p>
          )}
        </div>
      )}

      {/* The other star projects get the same treatment as the truck: one object-style button
          for the main thing to open. Links that are already an embed stay as embeds below;
          a plain PDF or button link is replaced by the star button. */}
      {star && starLink && (
        <div className="mb-6 -ml-2">
          <StarButton variant={star.variant} href={starLink.url} external>
            {star.label}
          </StarButton>
        </div>
      )}

      {/* Media: embeddable links (YouTube, Google Drive, Figma) first, then button links */}
      {mediaLinks && mediaLinks.length > 0 && (
        <div className="mb-10">
          {mediaLinks.filter((l) => isEmbeddable(l.url)).map((l) => (
            <MediaEmbed key={l.url} url={l.url} label={l.label} />
          ))}
          {mediaLinks.filter((l) => !isEmbeddable(l.url)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mediaLinks
                .filter((l) => !isEmbeddable(l.url))
                .map((l) => (
                  <MediaEmbed key={l.url} url={l.url} label={l.label} />
                ))}
            </div>
          )}
        </div>
      )}

      <hr className="mb-10" style={{ borderColor: 'var(--border-8)' }} />

      {/* MDX body */}
      {body.trim() ? (
        <div className="prose">
          <MDXRemote source={body} components={MDX_COMPONENTS} />
        </div>
      ) : (
        <div
          className="rounded-xl p-6 border text-sm"
          style={{ borderColor: 'var(--border-8)', background: 'var(--card-bg)', color: 'var(--fg-eyebrow)' }}
        >
          <p className="mb-1 font-medium" style={{ color: 'var(--fg-muted)' }}>This page is empty.</p>
          To add content, open{' '}
          <code className="bg-white/8 px-1 rounded text-white/40">
            content/projects/{slug}.mdx
          </code>{' '}
          and write below the second <code className="bg-white/8 px-1 rounded text-white/40">---</code>.
        </div>
      )}

      {/* Plain text, no chip — a footnote, not another badge to scan. */}
      {tools && tools.length > 0 && (
        <p className="mt-10 text-xs" style={{ color: 'var(--fg-eyebrow)' }}>
          Built with {tools.join(', ')}
        </p>
      )}

      {/* The end of a write-up is where someone has decided to act, so it
          offers the next step instead of stopping: another project, or the
          same two actions that close the home page. */}
      <section className="mt-16 border-t pt-8" style={{ borderColor: 'var(--border-med)' }}>
        {nextProject && (
          <Link href={`/projects/${nextProject.slug}`} className="index-row block pb-10">
            <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--fg-eyebrow)' }}>
              {next?.wrapped ? 'Back to the top' : 'Next project'}
            </span>
            <span className="row-wrap mt-3 flex items-baseline gap-4">
              <span className="index-label text-[clamp(1.5rem,3.2vw,2.15rem)] leading-tight tracking-[-0.025em]" style={{ color: 'var(--fg)' }}>
                {nextProject.frontmatter.title}
              </span>
              <span className="index-leader min-w-6 flex-1 -translate-y-[0.35rem]" aria-hidden="true" />
              <span className="flex-shrink-0 text-[10.5px] uppercase tracking-[0.14em]" style={{ color: 'var(--fg-60)' }}>
                {nextProject.frontmatter.artifactType ?? nextProject.frontmatter.category} <span aria-hidden="true">→</span>
              </span>
            </span>
          </Link>
        )}
        <div className="flex flex-wrap items-baseline gap-x-10 gap-y-4">
          <ContactActions />
          <Link href="/projects" className="tap-44 rail-link inline-block pb-1 text-[1.125rem] tracking-[-0.01em]" style={{ color: 'var(--fg-70)' }}>
            All projects
          </Link>
        </div>
      </section>
    </div>
  );
}
