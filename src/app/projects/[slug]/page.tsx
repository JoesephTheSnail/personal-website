import { getAllProjects } from '@/lib/projects';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface Props { params: Promise<{ slug: string }>; }

export async function generateStaticParams() {
  return getAllProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const project = getAllProjects().find((p) => p.slug === slug);
  return { title: project ? `${project.frontmatter.title} — Arnav Chandra` : 'Project' };
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
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
  const project = getAllProjects().find((p) => p.slug === slug);
  if (!project) notFound();

  const { title, date, description, links } = project.frontmatter;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm transition-colors mb-8"
        style={{ color: 'var(--fg-35)' }}
      >
        ← Back to Projects
      </Link>

      {/* Header */}
      <h1 className="font-poppins font-semibold text-3xl tracking-tight mb-2" style={{ color: 'var(--fg)' }}>
        {title}
      </h1>
      <p className="text-sm mb-1" style={{ color: 'var(--fg-dim)' }}>{date}</p>
      <p className="text-base mb-8 leading-relaxed" style={{ color: 'var(--fg-60)' }}>{description}</p>

      {/* Media: YouTube embeds first, then link buttons */}
      {links && links.length > 0 && (
        <div className="mb-10">
          {/* YouTube embeds */}
          {links.filter((l) => getYouTubeId(l.url) !== null).map((l) => (
            <MediaEmbed key={l.url} url={l.url} label={l.label} />
          ))}
          {/* Figma embeds */}
          {links.filter((l) => l.url.includes('figma.com') && !l.url.includes('placeholder')).map((l) => (
            <MediaEmbed key={l.url} url={l.url} label={l.label} />
          ))}
          {/* Button links (non-embeddable) */}
          {links.filter((l) => getYouTubeId(l.url) === null && !(l.url.includes('figma.com') && !l.url.includes('placeholder'))).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {links
                .filter((l) => getYouTubeId(l.url) === null && !(l.url.includes('figma.com') && !l.url.includes('placeholder')))
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
