import { ImageResponse } from 'next/og';
import { getAllProjects } from '@/lib/projects';
import { CATEGORIES, getCategoryBySlug } from '@/lib/categoryMeta';

// A share card per project and per discipline page, so a pasted link shows what
// the page is about instead of the generic home-page card.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Arnav Chandra: project';

export function generateStaticParams() {
  return [...getAllProjects().map((p) => ({ slug: p.slug })), ...CATEGORIES.map((c) => ({ slug: c.slug }))];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  const project = getAllProjects().find((p) => p.slug === slug);

  const eyebrow = category ? 'Discipline' : (project?.frontmatter.artifactType ?? project?.frontmatter.category ?? 'Project');
  const title = category ? `${category.label} projects` : (project?.frontmatter.title ?? 'Project');
  const detail = category ? 'By Arnav Chandra' : (project?.frontmatter.description ?? '');
  const titleSize = title.length > 48 ? 60 : title.length > 28 ? 72 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          background: '#121211',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          fontFamily: '-apple-system, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ display: 'flex', color: '#5BA3C2', fontSize: 24, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {eyebrow}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', color: '#EEE9DF', fontSize: titleSize, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.02 }}>
            {title}
          </div>
          {detail ? (
            <div style={{ display: 'flex', marginTop: 28, color: 'rgba(238,233,223,0.6)', fontSize: 30, lineHeight: 1.35, maxWidth: 980 }}>
              {detail.length > 150 ? `${detail.slice(0, 147)}...` : detail}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(238,233,223,0.55)', fontSize: 26 }}>
          <div style={{ display: 'flex', color: '#EEE9DF', fontWeight: 600 }}>Arnav Chandra</div>
          <div style={{ display: 'flex' }}>arnavchandra.com</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
