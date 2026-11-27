'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { eyebrow, smallCaps } from '@/components/typeClasses';

// Each book's takeaway is MDX, which only renders on the server — so the
// page renders it there and hands the finished node down as a prop. This
// component never re-renders that content, it only decides the order.
export interface BookListItem {
  slug: string;
  title: string;
  author: string;
  cover: string;
  date: string;
  /** Timestamp precomputed server-side: the date strings are hand-written ("March 2025"), and lib/books.ts can't be imported here because it reads from disk. */
  sortDate: number;
  rating: number;
  genres: string[];
  takeaway: React.ReactNode;
}

type SortKey = 'recent' | 'rating' | 'title';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recently read' },
  { key: 'rating', label: 'Highest rated' },
  { key: 'title',  label: 'Title A–Z' },
];

// Broad groups instead of every individual genre tag, so the filter fits on
// one line. A book belongs to a group if any of its own genres is listed here;
// the individual genres still show on each book.
const GENRE_GROUPS: { label: string; genres: string[] }[] = [
  { label: 'Mind',     genres: ['Psychology', 'Mindset', 'Philosophy', 'Science', 'Memoir'] },
  { label: 'Growth',   genres: ['Self-Help', 'Habits', 'Productivity'] },
  { label: 'Business', genres: ['Business', 'Strategy', 'Economics'] },
];


function StarRating({ rating }: { rating: number }) {
  const stars = rating / 2; // convert /10 → /5
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`Rated ${stars % 1 === 0 ? stars : stars.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const full = stars >= n;
        const half = !full && stars >= n - 0.5;
        return (
          <span key={n} aria-hidden="true" className="relative inline-block" style={{ fontSize: '0.85rem', lineHeight: 1 }}>
            <span style={{ color: 'var(--fg-30)' }}>★</span>
            {(full || half) && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: full ? '100%' : '50%', color: 'var(--accent)' }}>
                ★
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** A row of plain-text toggles: the active one gets the petrol underline. */
function Toggles<T extends string | null>({
  label, options, value, onChange,
}: {
  label: string;
  options: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid items-baseline gap-x-6 gap-y-2 sm:grid-cols-[7rem_1fr]">
      <span className={eyebrow} style={{ color: 'var(--fg-eyebrow)' }}>{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap gap-x-6 gap-y-2">
        {options.map((o) => {
          const on = value === o.key;
          return (
            <button
              key={String(o.key)}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.key)}
              className={`tap-44 ledger-filter pb-1 text-[0.9375rem] ${on ? 'proud-link' : ''}`}
              style={{ color: on ? 'var(--fg)' : 'var(--fg-60)' }}
            >
              {o.label}
              {o.count !== undefined && (
                <span className="ml-1.5 text-[10.5px] tabular-nums" style={{ color: 'var(--fg-45)' }}>{o.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BooksList({ items }: { items: BookListItem[] }) {
  const [sort, setSort] = useState<SortKey>('recent');
  const [genre, setGenre] = useState<string | null>(null);
  // Set on the first sort or genre change; the list then plays a short fade.
  const [swapped, setSwapped] = useState(false);

  // Only groups that at least one book falls into.
  const groups = useMemo(
    () => GENRE_GROUPS.filter((g) => items.some((b) => b.genres.some((x) => g.genres.includes(x)))),
    [items],
  );

  const shown = useMemo(() => {
    const group = GENRE_GROUPS.find((g) => g.label === genre);
    const filtered = group ? items.filter((b) => b.genres.some((x) => group.genres.includes(x))) : items;
    const sorted = [...filtered];
    if (sort === 'recent') sorted.sort((a, b) => b.sortDate - a.sortDate);
    // Unrated books (rating 0) sink to the bottom rather than leading a
    // "highest rated" list, which is what a plain descending sort would do
    // to anything still missing a score.
    if (sort === 'rating') sorted.sort((a, b) => (b.rating || -1) - (a.rating || -1) || b.sortDate - a.sortDate);
    if (sort === 'title')  sorted.sort((a, b) => a.title.localeCompare(b.title));
    return sorted;
  }, [items, sort, genre]);

  return (
    <>
      <div className="space-y-4 border-t pt-5 pb-10" style={{ borderColor: 'var(--border-med)' }}>
        <Toggles<SortKey> label="Sort" options={SORTS.map((s) => ({ key: s.key, label: s.label }))} value={sort} onChange={(v) => { setSwapped(true); setSort(v); }} />
        {groups.length > 1 && (
          <Toggles<string | null>
            label="Genre"
            options={[{ key: null, label: 'All' }, ...groups.map((g) => ({ key: g.label as string | null, label: g.label }))]}
            value={genre}
            onChange={(v) => { setSwapped(true); setGenre(v); }}
          />
        )}
      </div>

      {/* Only worth saying when a filter is actually narrowing the list. */}
      <p className="sr-only" aria-live="polite">
        {genre ? `${shown.length} ${shown.length === 1 ? 'book' : 'books'} in ${genre}` : ''}
      </p>

      <div key={`${sort}|${genre}`} className={swapped ? 'list-swap' : undefined}>
        {shown.map((book) => (
          <article
            key={book.slug}
            id={book.slug}
            // Phones: the cover sits beside the title block (title, author, genre, date read, rating) and the
            // notes run full width underneath. From sm up the cover is the label column; from lg the notes
            // move beside the title block so the row uses its full width.
            className="grid scroll-mt-28 grid-cols-[72px_minmax(0,1fr)] gap-x-4 gap-y-5 border-t py-8 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-6 lg:grid-cols-[7rem_minmax(0,19rem)_minmax(0,1fr)] lg:gap-x-10"
            style={{ borderColor: 'var(--border-med)' }}
          >
            <div className="relative h-[108px] w-[72px] overflow-hidden sm:h-[132px] sm:w-[88px]" style={{ border: '1px solid var(--border-med)' }}>
              <Image src={book.cover} alt={`Cover of ${book.title}`} fill className="object-cover" sizes="(min-width: 640px) 88px, 72px" />
            </div>

            <div className="min-w-0">
              <h2
                className="text-[clamp(1.2rem,5vw,1.35rem)] leading-tight tracking-[-0.025em] sm:text-[clamp(1.35rem,2.6vw,1.75rem)]"
                style={{ color: 'var(--fg)', overflowWrap: 'break-word' }}
              >
                {book.title}
              </h2>
              <p className="mt-1.5 text-[0.9375rem]" style={{ color: 'var(--fg-70)' }}>
                {book.author}
              </p>

              <div className={`mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 ${smallCaps}`} style={{ color: 'var(--fg-60)' }}>
                {book.genres.length > 0 && <span>{book.genres.join(' · ')}</span>}
                {book.date && <span>Read {book.date}</span>}
                {book.rating > 0 ? <StarRating rating={book.rating} /> : <span style={{ color: 'var(--fg-45)' }}>Unrated</span>}
              </div>
            </div>

            {book.takeaway && (
              <div
                className="prose col-span-2 max-w-2xl sm:col-span-1 sm:col-start-2 lg:col-start-3 lg:mt-1"
                style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
              >
                {book.takeaway}
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
