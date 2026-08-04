import Link from 'next/link';
import { FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { getCategoryMeta } from '@/lib/categoryMeta';
import ThemedIcon from './ThemedIcon';

export interface NowItem {
  slug: string;
  title: string;
  description: string;
  category: string;
}

export default function NowSection({ items }: { items: NowItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <span className="now-breathe inline-flex rounded-full h-1.5 w-1.5" style={{ background: '#34d399' }} />
        <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--fg-eyebrow)' }}>
          What I&apos;m doing now
        </p>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const meta = getCategoryMeta(item.category);
          const Icon = meta.icon;
          // Plain div, not a Link — these are 'upcoming' projects with no
          // real case-study page yet, so making them clickable just sent
          // visitors to a blank page.
          return (
            <div
              key={item.slug}
              className="flex items-center gap-4 rounded-xl p-4 border"
              style={{ borderColor: 'var(--border-9)', background: 'var(--card-bg)' }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: meta.bg }}
              >
                <ThemedIcon color={meta.color} lightColor={meta.lightColor}>
                  <Icon size={15} />
                </ThemedIcon>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm mb-0.5" style={{ color: 'var(--fg)' }}>
                  {item.title}
                </h3>
                <p className="text-[0.8125rem] leading-relaxed line-clamp-1" style={{ color: 'var(--fg-muted)' }}>
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-xs mt-3 hover:underline underline-offset-2 transition-colors"
        style={{ color: 'var(--fg-dim)' }}
      >
        See all projects
        <FaArrowUpRightFromSquare size={10} />
      </Link>
    </section>
  );
}
