import Link from 'next/link';
import {
  FaMobileAlt, FaFlask, FaFilm, FaCog,
  FaFolder, FaLightbulb, FaChalkboard,
} from 'react-icons/fa';
import { HiArrowUpRight } from 'react-icons/hi2';

type CatMeta = { icon: React.ElementType; color: string; bg: string };

const CATEGORY_META: Record<string, CatMeta> = {
  'Creative':    { icon: FaLightbulb,  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  'Product':     { icon: FaMobileAlt,  color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  'Research':    { icon: FaFlask,      color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  'Pitch Deck':  { icon: FaChalkboard, color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  'Film':        { icon: FaFilm,       color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  'Engineering': { icon: FaCog,        color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
};

function getCatMeta(cat: string): CatMeta {
  return CATEGORY_META[cat] ?? { icon: FaFolder, color: 'var(--fg-45)', bg: 'rgba(255,255,255,0.08)' };
}

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
        <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--fg-30)' }}>
          What I&apos;m doing now
        </p>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const meta = getCatMeta(item.category);
          const Icon = meta.icon;
          return (
            <Link
              key={item.slug}
              href={`/projects/${item.slug}`}
              className="group flex items-center gap-4 rounded-xl p-4 border transition-all duration-200 hover:bg-white/4 hover:scale-[1.01]"
              style={{ borderColor: 'var(--border-9)', background: 'var(--card-bg)' }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                style={{ background: meta.bg }}
              >
                <Icon size={15} style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm mb-0.5 group-hover:text-white transition-colors" style={{ color: 'var(--fg)' }}>
                  {item.title}
                </h3>
                <p className="text-[0.8125rem] leading-relaxed line-clamp-1" style={{ color: 'var(--fg-muted)' }}>
                  {item.description}
                </p>
              </div>
              <HiArrowUpRight
                size={14}
                className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
                style={{ color: 'var(--fg-dim)' }}
              />
            </Link>
          );
        })}
      </div>

      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-xs mt-3 hover:underline underline-offset-2 transition-colors"
        style={{ color: 'var(--fg-dim)' }}
      >
        See all projects
        <HiArrowUpRight size={11} />
      </Link>
    </section>
  );
}
