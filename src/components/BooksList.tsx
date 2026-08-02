'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { HiChevronDown, HiCheck } from 'react-icons/hi2';

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

function StarRating({ rating }: { rating: number }) {
  const stars = rating / 2; // convert /10 → /5
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const full = stars >= n;
        const half = !full && stars >= n - 0.5;
        return (
          <span key={n} className="relative inline-block" style={{ fontSize: '0.8rem', lineHeight: 1 }}>
            <span style={{ color: 'var(--fg)', opacity: 0.2 }}>★</span>
            {(full || half) && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: full ? '100%' : '50%', color: 'var(--fg)' }}>
                ★
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function GenreTags({ genres }: { genres: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {genres.map((g) => (
        <span
          key={g}
          style={{
            fontSize: '0.6rem', padding: '2px 7px', borderRadius: '9999px',
            border: '1px solid var(--border-med)', color: 'var(--fg-35)',
            letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}
        >
          {g}
        </span>
      ))}
    </div>
  );
}

export default function BooksList({ items }: { items: BookListItem[] }) {
  const [sort, setSort] = useState<SortKey>('recent');
  const [genre, setGenre] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape — a dropdown that can only be dismissed
  // by re-clicking its own trigger feels broken.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const genres = useMemo(() => {
    const seen = new Map<string, number>();
    for (const b of items) for (const g of b.genres) seen.set(g, (seen.get(g) ?? 0) + 1);
    // Most-used first, so the row leads with the genres actually worth filtering by.
    return [...seen.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([g]) => g);
  }, [items]);

  const shown = useMemo(() => {
    const filtered = genre ? items.filter((b) => b.genres.includes(genre)) : items;
    const sorted = [...filtered];
    if (sort === 'recent') sorted.sort((a, b) => b.sortDate - a.sortDate);
    // Unrated books (rating 0) sink to the bottom rather than leading a
    // "highest rated" list, which is what a plain descending sort would do
    // to anything still missing a score.
    if (sort === 'rating') sorted.sort((a, b) => (b.rating || -1) - (a.rating || -1) || b.sortDate - a.sortDate);
    if (sort === 'title')  sorted.sort((a, b) => a.title.localeCompare(b.title));
    return sorted;
  }, [items, sort, genre]);

  const activeSort = SORTS.find((s) => s.key === sort)!;

  return (
    <>
      {/* A single quiet trigger rather than a wall of pills: the current
          state is legible at a glance, and the options only take up space
          while you're actually choosing. */}
      <div className="flex justify-end mb-3">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="menu"
            className="books-trigger"
          >
            <span>{activeSort.label}</span>
            {genre && <span style={{ color: 'var(--fg-30)' }}>·</span>}
            {genre && <span>{genre}</span>}
            <HiChevronDown
              size={12}
              aria-hidden="true"
              style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
            />
          </button>

          {open && (
            <div className="books-menu" role="menu">
              <p className="books-menu__label">Sort</p>
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  role="menuitemradio"
                  aria-checked={sort === s.key}
                  onClick={() => { setSort(s.key); setOpen(false); }}
                  className="books-menu__item"
                >
                  <span>{s.label}</span>
                  {sort === s.key && <HiCheck size={12} aria-hidden="true" />}
                </button>
              ))}

              {genres.length > 1 && (
                <>
                  <div className="books-menu__sep" />
                  <p className="books-menu__label">Genre</p>
                  <div className="books-menu__scroll">
                    <button
                      role="menuitemradio"
                      aria-checked={genre === null}
                      onClick={() => { setGenre(null); setOpen(false); }}
                      className="books-menu__item"
                    >
                      <span>All genres</span>
                      {genre === null && <HiCheck size={12} aria-hidden="true" />}
                    </button>
                    {genres.map((g) => (
                      <button
                        key={g}
                        role="menuitemradio"
                        aria-checked={genre === g}
                        onClick={() => { setGenre(g === genre ? null : g); setOpen(false); }}
                        className="books-menu__item"
                      >
                        <span>{g}</span>
                        {genre === g && <HiCheck size={12} aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Only worth saying when a filter is actually narrowing the list. */}
      {genre && (
        <p className="text-xs mb-4" aria-live="polite" style={{ color: 'var(--fg-30)' }}>
          {shown.length} {shown.length === 1 ? 'book' : 'books'} in {genre}
        </p>
      )}

      <div className="space-y-4 sm:space-y-6">
        {shown.map((book) => (
          <article
            key={book.slug}
            id={book.slug}
            className="scroll-mt-10 rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--border-9)', background: 'var(--card-bg)' }}
          >
            <div className="flex gap-3 sm:gap-4 items-start p-3 sm:p-5">
              <div
                className="flex-shrink-0 rounded overflow-hidden"
                style={{ width: 48, height: 72, position: 'relative', border: '1px solid var(--border-med)' }}
              >
                <Image src={book.cover} alt={`Cover of ${book.title}`} fill className="object-cover" sizes="48px" />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <h2
                  className="font-poppins font-semibold leading-snug mb-1"
                  style={{
                    color: 'var(--fg)',
                    fontSize: 'clamp(0.875rem, 3.5vw, 1.0625rem)',
                    overflowWrap: 'break-word', wordBreak: 'break-word',
                  }}
                >
                  {book.title}
                </h2>
                <p className="text-xs sm:text-sm leading-snug mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                  {book.author}
                </p>

                {book.genres.length > 0 && <GenreTags genres={book.genres} />}

                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2">
                  <p className="text-xs" style={{ color: 'var(--fg-30)' }}>
                    Read: <span style={{ color: 'var(--fg-muted)' }}>{book.date || 'N/A'}</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs" style={{ color: 'var(--fg-30)' }}>Rating:</span>
                    {book.rating > 0
                      ? <StarRating rating={book.rating} />
                      : <span className="text-xs" style={{ color: 'var(--fg-dimmer)' }}>N/A</span>}
                  </div>
                </div>
              </div>
            </div>

            {book.takeaway && (
              <>
                <div style={{ borderTop: '1px solid var(--border)' }} />
                <div
                  className="px-3 sm:px-5 py-3 sm:py-4 prose"
                  style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
                >
                  {book.takeaway}
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
