import Link from 'next/link';
import { FaArrowUpRightFromSquare } from 'react-icons/fa6';

export interface NowItem {
  slug: string;
  title: string;
  description: string;
  category: string;
}

export default function NowSection({ items }: { items: NowItem[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      {/* Ruled rows, not cards: matches the hairline headings elsewhere on the
          page. No icon tile, no rounded box. The heading lives in the page. */}
      <ul className="border-t" style={{ borderColor: 'var(--border-med)' }}>
        {items.map((item) => (
          // Plain row, not a Link — these are 'upcoming' projects with no real
          // case-study page yet, so making them clickable just sent visitors to
          // a blank page.
          <li
            key={item.slug}
            className="py-4 border-b"
            style={{ borderColor: 'var(--border-med)' }}
          >
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-[1.125rem] font-normal tracking-[-0.015em]" style={{ color: 'var(--fg)' }}>
                {item.title}
              </h3>
              <span className="text-[10.5px] uppercase tracking-[0.14em] flex-shrink-0" style={{ color: 'var(--fg-60)' }}>
                {item.category}
              </span>
            </div>
            <p className="mt-1 text-[0.875rem] leading-relaxed" style={{ color: 'var(--fg-70)' }}>
              {item.description}
            </p>
          </li>
        ))}
      </ul>

      <Link
        href="/projects"
        className="tap-44 inline-flex items-center gap-1 text-xs mt-3 hover:underline underline-offset-2 transition-colors"
        style={{ color: 'var(--fg-dim)' }}
      >
        See all projects
        <FaArrowUpRightFromSquare size={10} />
      </Link>
    </div>
  );
}
