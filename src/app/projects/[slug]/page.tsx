import { getAllProjects } from '@/lib/projects';
import { CATEGORIES, getCategoryBySlug, getCategoryByLabel } from '@/lib/categoryMeta';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { HiOutlineDocumentText, HiArrowUpRight } from 'react-icons/hi2';
import CategoryIndexList from '@/components/CategoryIndexList';
import ThemedIcon from '@/components/ThemedIcon';
import BackLink from '@/components/BackLink';
import { projectCardTransitionName } from '@/lib/viewTransition';

interface Props { params: Promise<{ slug: string }>; }

export async function generateStaticParams() {
  const projectParams = getAllProjects().map((p) => ({ slug: p.slug }));
  const categoryParams = CATEGORIES.map((c) => ({ slug: c.slug }));
  return [...projectParams, ...categoryParams];
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;

  const category = getCategoryBySlug(slug);
  if (category) {
    const url = `https://arnavchandra.com/projects/${slug}`;
    const title = `${category.label} projects`;
    const description = `${category.label} projects by Arnav Chandra.`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title: `${title} | Arnav Chandra`, description, url, type: 'website' },
    };
  }

  const project = getAllProjects().find((p) => p.slug === slug);
  if (!project) return { title: 'Project' };

  const pageTitle = project.frontmatter.title;
  const fullTitle = `${pageTitle} | Arnav Chandra`;
  const description = project.frontmatter.description;
  const url = `https://arnavchandra.com/projects/${slug}`;

  return {
    title: pageTitle,
    description,
    alternates: { canonical: url },
    openGraph: { title: fullTitle, description, url, type: 'article' },
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
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${ytId}`}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
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
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://drive.google.com/file/d/${driveId}/preview`}
            title={label}
            allow="autoplay"
            allowFullScreen
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
          className="group flex items-center gap-4 sm:gap-5 rounded-xl border p-4 sm:p-5 transition-all duration-200 hover:border-white/30 hover:bg-white/4"
          style={{ borderColor: 'var(--border-8)', background: 'var(--card-bg)' }}
        >
          <div
            className="relative flex-shrink-0 rounded-lg overflow-hidden border shadow-lg transition-transform duration-200 group-hover:scale-[1.02]"
            style={{ width: 84, aspectRatio: '17 / 22', borderColor: 'var(--border-med)' }}
          >
            <Image src={coverSrc} alt={`Cover page of ${label}`} fill className="object-cover" sizes="84px" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <HiOutlineDocumentText size={15} style={{ color: 'var(--fg-dim)' }} />
              <span className="font-poppins font-semibold text-sm" style={{ color: 'var(--fg)' }}>{label}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--fg-dim)' }}>PDF Report · Opens in a new tab</p>
          </div>
          <HiArrowUpRight
            size={16}
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
            <iframe
              className="w-full h-full"
              src={`https://www.figma.com/embed?embed_host=personal-site&url=${encodeURIComponent(url)}`}
              title={label}
              allowFullScreen
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
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.figma.com/embed?embed_host=personal-site&url=${encodeURIComponent(url)}`}
            title={label}
            allowFullScreen
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
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 mb-3 mr-3"
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

    const Icon = category.icon;
    return (
      <div
        className="max-w-3xl mx-auto"
        data-project-transition={slug}
        style={{ viewTransitionName: projectCardTransitionName(slug) }}
      >
        <BackLink fallbackHref="/projects" label="Back to Projects" />

        <div className="flex items-center gap-2.5 mb-2">
          <ThemedIcon color={category.color} lightColor={category.lightColor} className="inline-flex">
            <Icon size={20} />
          </ThemedIcon>
          <h1 className="font-poppins font-semibold text-3xl tracking-tight" style={{ color: 'var(--fg)' }}>
            {category.label}
          </h1>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--fg-dim)' }}>
          {categoryProjects.length} project{categoryProjects.length === 1 ? '' : 's'}
        </p>

        <CategoryIndexList projects={categoryProjects} color={category.color} lightColor={category.lightColor} />
      </div>
    );
  }

  const project = getAllProjects().find((p) => p.slug === slug);
  if (!project) notFound();

  const { title, date, description, links, category: categoryLabel } = project.frontmatter;
  // Falls back to the project's own category page (not the full grid) when
  // there's no in-site history to go back to — a shared/direct link to a
  // Robotics writeup should land back on Engineering, not the top grid.
  const parentCategory = categoryLabel ? getCategoryByLabel(categoryLabel) : undefined;
  const backHref = parentCategory ? `/projects/${parentCategory.slug}` : '/projects';

  return (
    <div className="max-w-3xl mx-auto" data-project-transition={slug} style={{ viewTransitionName: projectCardTransitionName(slug) }}>
      <BackLink fallbackHref={backHref} label="Back to Projects" />

      {/* Header */}
      <h1 className="font-poppins font-semibold text-3xl tracking-tight mb-2" style={{ color: 'var(--fg)' }}>
        {title}
      </h1>
      <p className="text-sm mb-1" style={{ color: 'var(--fg-dim)' }}>{date}</p>
      <p className="text-base mb-8 leading-relaxed" style={{ color: 'var(--fg-60)' }}>{description}</p>

      {/* Media: embeddable links (YouTube, Google Drive, Figma) first, then button links */}
      {links && links.length > 0 && (
        <div className="mb-10">
          {links.filter((l) => isEmbeddable(l.url)).map((l) => (
            <MediaEmbed key={l.url} url={l.url} label={l.label} />
          ))}
          {links.filter((l) => !isEmbeddable(l.url)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {links
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
      {project.content.trim() ? (
        <div className="prose">
          <MDXRemote source={project.content} />
        </div>
      ) : (
        <div
          className="rounded-xl p-6 border text-sm italic"
          style={{ borderColor: 'var(--border-8)', background: 'var(--card-bg)', color: 'var(--fg-30)' }}
        >
          <p className="mb-1 not-italic font-medium" style={{ color: 'var(--fg-muted)' }}>This page is empty.</p>
          To add content, open{' '}
          <code className="bg-white/8 px-1 rounded text-white/40">
            content/projects/{slug}.mdx
          </code>{' '}
          and write below the second <code className="bg-white/8 px-1 rounded text-white/40">---</code>.
        </div>
      )}
    </div>
  );
}
