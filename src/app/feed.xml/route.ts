import { getAllProjects } from '@/lib/projects';
import { compareProjects } from '@/lib/projectOrder';

// RSS feed of published projects, newest first. Linked from every page's <head> (see layout.tsx).
// Project dates are year or year-month strings, so the feed date is the first of that month or year.
export const dynamic = 'force-static';

const BASE = 'https://arnavchandra.com';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function toDate(value: string | undefined): Date | null {
  const m = value?.match(/^(\d{4})(?:-(\d{2}))?/);
  return m ? new Date(Date.UTC(Number(m[1]), m[2] ? Number(m[2]) - 1 : 0, 1)) : null;
}

export function GET() {
  const projects = getAllProjects()
    .filter((p) => p.frontmatter.status === 'published')
    .sort(compareProjects);

  const items = projects
    .map((p) => {
      const url = `${BASE}/projects/${p.slug}`;
      const date = toDate(p.frontmatter.date);
      return `    <item>
      <title>${esc(p.frontmatter.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>${date ? `\n      <pubDate>${date.toUTCString()}</pubDate>` : ''}
      <description>${esc(p.frontmatter.description)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Arnav Chandra: projects</title>
    <link>${BASE}/projects</link>
    <description>Projects by Arnav Chandra, a writer, student and builder working on health and technology.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
