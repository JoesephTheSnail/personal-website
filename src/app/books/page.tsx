import { getAllBooks } from '@/lib/books';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Image from 'next/image';
import BookCoverScroll from '@/components/BookCoverScroll';

export const metadata = {
  title: 'Books',
  description:
    'Books Arnav Chandra has read, with ratings and notes — spanning health, technology, psychology, and personal growth.',
  alternates: { canonical: 'https://arnavchandra.com/books' },
};

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
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: full ? '100%' : '50%', color: 'var(--fg)' }}
              >
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
            fontSize: '0.6rem',
            padding: '2px 7px',
            borderRadius: '9999px',
            border: '1px solid var(--border-med)',
            color: 'var(--fg-35)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {g}
        </span>
      ))}
    </div>
  );
}

export default function BooksPage() {
  const books = getAllBooks();

  const currentlyReading = books.filter((b) => b.frontmatter.status === 'reading');
  const readBooks = books.filter((b) => b.frontmatter.status !== 'reading');

  const coverItems = readBooks.map((b) => ({
    slug: b.frontmatter.slug,
    title: b.frontmatter.title,
    cover: b.frontmatter.cover,
  }));

  return (
    <div className="max-w-3xl mx-auto sm:px-0 px-2" style={{ overflowX: 'hidden' }}>
      <h1 className="font-poppins font-semibold text-4xl mb-2 tracking-tight" style={{ color: 'var(--fg)' }}>
        Books
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--fg-dim)' }}>
        Everything I&apos;ve read, with personal notes and ratings.
      </p>

      {/* ── Currently Reading ── */}
      {currentlyReading.length > 0 && (
        <section className="mb-10">
          <h2 className="font-poppins font-semibold text-sm mb-3 tracking-widest uppercase" style={{ color: 'var(--fg-35)' }}>
            Now Reading
          </h2>
          <div className="space-y-3">
            {currentlyReading.map((book) => (
              <article
                key={book.slug}
                id={book.frontmatter.slug}
                className="scroll-mt-10 rounded-xl border overflow-hidden"
                style={{ borderColor: 'var(--border-9)', background: 'var(--card-bg)' }}
              >
                <div className="flex gap-3 sm:gap-4 items-start p-3 sm:p-5">
                  {/* Cover */}
                  <div
                    className="flex-shrink-0 rounded overflow-hidden"
                    style={{ width: 56, height: 84, position: 'relative', border: '1px solid var(--border-med)' }}
                  >
                    <Image
                      src={book.frontmatter.cover}
                      alt={book.frontmatter.title}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>

                  {/* Meta */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="text-[0.6rem] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--fg-50)' }}
                      >
                        In Progress
                      </span>
                    </div>
                    <h2
                      className="font-poppins font-semibold leading-snug mb-1"
                      style={{
                        color: 'var(--fg)',
                        fontSize: 'clamp(0.875rem, 3.5vw, 1.0625rem)',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                      }}
                    >
                      {book.frontmatter.title}
                    </h2>
                    <p className="text-xs sm:text-sm leading-snug" style={{ color: 'var(--fg-muted)' }}>
                      {book.frontmatter.author}
                    </p>
                    {book.frontmatter.genre && book.frontmatter.genre.length > 0 && (
                      <GenreTags genres={book.frontmatter.genre} />
                    )}
                  </div>
                </div>

              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Animated scrolling cover strip ── */}
      <BookCoverScroll books={coverItems} />

      {/* ── Read books list ── */}
      <div className="space-y-4 sm:space-y-6">
        {readBooks.map((book) => (
          <article
            key={book.slug}
            id={book.frontmatter.slug}
            className="scroll-mt-10 rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--border-9)', background: 'var(--card-bg)' }}
          >
            {/* Header row */}
            <div className="flex gap-3 sm:gap-4 items-start p-3 sm:p-5">
              {/* Cover thumbnail */}
              <div
                className="flex-shrink-0 rounded overflow-hidden"
                style={{ width: 48, height: 72, position: 'relative', border: '1px solid var(--border-med)' }}
              >
                <Image
                  src={book.frontmatter.cover}
                  alt={book.frontmatter.title}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>

              {/* Meta */}
              <div className="flex-1 min-w-0 pt-0.5">
                <h2
                  className="font-poppins font-semibold leading-snug mb-1"
                  style={{
                    color: 'var(--fg)',
                    fontSize: 'clamp(0.875rem, 3.5vw, 1.0625rem)',
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word',
                  }}
                >
                  {book.frontmatter.title}
                </h2>
                <p className="text-xs sm:text-sm leading-snug mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                  {book.frontmatter.author}
                </p>

                {/* Genre tags */}
                {book.frontmatter.genre && book.frontmatter.genre.length > 0 && (
                  <GenreTags genres={book.frontmatter.genre} />
                )}

                {/* Rating + date */}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2">
                  <p className="text-xs" style={{ color: 'var(--fg-30)' }}>
                    Read:{' '}
                    <span style={{ color: 'var(--fg-muted)' }}>
                      {book.frontmatter.date || '—'}
                    </span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs" style={{ color: 'var(--fg-30)' }}>Rating:</span>
                    {book.frontmatter.rating > 0 ? (
                      <StarRating rating={book.frontmatter.rating} />
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--fg-dimmer)' }}>—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Takeaway */}
            {book.content.trim() && (
              <>
                <div style={{ borderTop: '1px solid var(--border)' }} />
                <div
                  className="px-3 sm:px-5 py-3 sm:py-4 prose"
                  style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
                >
                  <MDXRemote source={book.content} />
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
