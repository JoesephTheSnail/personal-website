'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Project } from '@/lib/projects';

export default function CategoryIndexList({
  projects,
  color,
  lightColor,
}: {
  projects: Project[];
  color: string;
  lightColor: string;
}) {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const update = () => setIsLight(document.documentElement.classList.contains('light'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const rowColor = isLight ? lightColor : color;

  // Positions below are deliberately explicit pixel values, not Tailwind
  // scale steps — the date column, rail, and dot all have to line up
  // across two different positioning contexts (rail is measured from the
  // outer container's edge; the date/dot are measured relative to each
  // row, which itself starts 80px in from that same edge because of the
  // container's own left padding), and rounding to the nearest Tailwind
  // step here previously let the date column drift right into the title.
  return (
    <div className="relative pl-20">
      <div className="absolute top-1 bottom-1" style={{ left: 64, width: 1, background: 'var(--border)' }} />
      {projects.map((p, i) => (
        <Link
          key={p.slug}
          href={`/projects/${p.slug}`}
          className="cat-index-row group relative block py-7"
          style={{
            borderTop: i === 0 ? 'none' : '1px solid var(--border)',
            ['--row-color' as string]: rowColor,
          }}
        >
          <span
            className="absolute text-xs whitespace-nowrap"
            style={{ left: -80, top: 28, width: 52, textAlign: 'right', color: 'var(--fg-dim)' }}
          >
            {p.frontmatter.date}
          </span>
          <span
            className="cat-index-dot absolute rounded-full"
            style={{ left: -20, top: 32, width: 8, height: 8, background: 'var(--bg)', border: '1.5px solid var(--fg-dimmer)' }}
          />
          <h3 className="cat-index-title font-poppins font-semibold text-lg sm:text-xl mb-1.5" style={{ color: 'var(--fg)' }}>
            {p.frontmatter.title}
          </h3>
          <p className="text-sm max-w-xl leading-relaxed" style={{ color: 'var(--fg-dim)' }}>
            {p.frontmatter.description}
          </p>
          <span className="cat-index-sweep" />
        </Link>
      ))}
    </div>
  );
}
