import { getAllBooks } from '@/lib/books';
import { pageMetadata } from '@/lib/seo';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Image from 'next/image';
import BookCoverScroll from '@/components/BookCoverScroll';
import BooksList, { type BookListItem } from '@/components/BooksList';
import { eyebrow, smallCaps } from '@/components/typeClasses';

export const metadata = pageMetadata('/books', 'Books', 'Books Arnav Chandra has read, with ratings and notes, spanning health, technology, psychology, and personal growth.');


export default function BooksPage() {
  const books = getAllBooks();

  const currentlyReading = books.filter((b) => b.frontmatter.status === 'reading');
  const wantToRead = books.filter((b) => b.frontmatter.status === 'want');
  const readBooks = books.filter((b) => b.frontmatter.status !== 'reading' && b.frontmatter.status !== 'want');

  const coverItems = readBooks.map((b) => ({
    slug: b.frontmatter.slug,
    title: b.frontmatter.title,
    cover: b.frontmatter.cover,
  }));

  // MDX only renders server-side, so each takeaway is rendered here and
  // handed down as a finished node — the client component reorders the
  // list without ever re-rendering that content.
  const listItems: BookListItem[] = readBooks.map((b) => {
    const parsed = Date.parse(b.frontmatter.date);
    return {
      slug: b.frontmatter.slug,
      title: b.frontmatter.title,
      author: b.frontmatter.author,
      cover: b.frontmatter.cover,
      date: b.frontmatter.date,
      sortDate: Number.isNaN(parsed) ? 0 : parsed,
      rating: b.frontmatter.rating,
      genres: b.frontmatter.genre ?? [],
      takeaway: b.content.trim() ? <MDXRemote source={b.content} /> : null,
    };
  });

  return (
    <div className="max-w-5xl mx-auto" style={{ overflowX: 'hidden' }}>
      <header className="relative mb-6 sm:mb-8">
        <p className={`rise ${eyebrow}`} style={{ color: 'var(--fg-eyebrow)' }}>
          Reading
        </p>
        <h1
          className="rise mt-3 text-[clamp(2.25rem,5.2vw,3.75rem)] font-medium leading-[0.95] tracking-[-0.04em]"
          style={{ ['--d' as string]: '80ms', color: 'var(--fg)' } as React.CSSProperties}
        >
          Books
        </h1>
        <p
          className="rise mt-4 text-[clamp(1.05rem,1.8vw,1.25rem)] tracking-tight"
          style={{ ['--d' as string]: '160ms', color: 'var(--fg-60)' } as React.CSSProperties}
        >
          Everything I&apos;ve read, with notes and ratings.
        </p>
      </header>

      {/* ── Now reading ── */}
      {currentlyReading.length > 0 && (
        <section className="grid gap-x-6 border-t pt-5 pb-10 sm:grid-cols-[7rem_1fr]" style={{ borderColor: 'var(--border-med)' }}>
          <h2 className={`${eyebrow} mb-4 flex items-center gap-2 whitespace-nowrap sm:mb-0`} style={{ color: 'var(--accent)' }}>
            <span className="inline-flex h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} aria-hidden="true" />
            Now reading
          </h2>
          <div className="space-y-6">
            {currentlyReading.map((book) => (
              <article key={book.slug} id={book.frontmatter.slug} className="flex scroll-mt-28 items-start gap-5">
                <div
                  className="relative flex-shrink-0 overflow-hidden"
                  style={{ width: 72, height: 108, border: '1px solid var(--border-med)' }}
                >
                  <Image src={book.frontmatter.cover} alt={`Cover of ${book.frontmatter.title}`} fill className="object-cover" sizes="72px" />
                </div>
                <div className="min-w-0 pt-1">
                  <h3 className="text-[clamp(1.35rem,2.6vw,1.75rem)] leading-tight tracking-[-0.025em]" style={{ color: 'var(--fg)' }}>
                    {book.frontmatter.title}
                  </h3>
                  <p className="mt-1.5 text-[0.9375rem]" style={{ color: 'var(--fg-70)' }}>
                    {book.frontmatter.author}
                  </p>
                  {book.frontmatter.genre && book.frontmatter.genre.length > 0 && (
                    <p className={`mt-3 ${smallCaps}`} style={{ color: 'var(--fg-60)' }}>
                      {book.frontmatter.genre.join(' · ')}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── The shelf: the cover strip that scrolls when you hover its edges ── */}
      <section className="border-t pt-5 pb-10" style={{ borderColor: 'var(--border-med)' }}>
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className={eyebrow} style={{ color: 'var(--fg-eyebrow)' }}>
            The shelf
          </h2>
        </div>
        <BookCoverScroll books={coverItems} />
      </section>

      {/* ── Read books (sortable / filterable) ── */}
      <BooksList items={listItems} />

      {/* ── Want to read: deliberately quiet. Small, muted covers, no ratings. ── */}
      {wantToRead.length > 0 && (
        <section className="grid gap-x-6 border-t pt-5 pb-10 sm:grid-cols-[7rem_1fr]" style={{ borderColor: 'var(--border-med)' }}>
          <h2 className={`${eyebrow} mb-5 sm:mb-0`} style={{ color: 'var(--fg-eyebrow)' }}>
            Want to read
          </h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-6">
            {wantToRead.map((b) => (
              <li key={b.slug} className="w-[72px]">
                <div
                  className="relative h-[108px] w-[72px] overflow-hidden opacity-70 transition-opacity duration-200 hover:opacity-100"
                  style={{ border: '1px solid var(--border-med)' }}
                >
                  <Image src={b.frontmatter.cover} alt={`Cover of ${b.frontmatter.title}`} fill className="object-cover" sizes="72px" />
                </div>
                <p className="mt-2 text-[11.5px] leading-snug" style={{ color: 'var(--fg-70)' }}>
                  {b.frontmatter.title}
                </p>
                <p className="mt-0.5 text-[10.5px] leading-snug" style={{ color: 'var(--fg-45)' }}>
                  {b.frontmatter.author}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
