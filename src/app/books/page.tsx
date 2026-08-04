import { getAllBooks } from '@/lib/books';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Image from 'next/image';
import BookCoverScroll from '@/components/BookCoverScroll';
import BooksList, { type BookListItem } from '@/components/BooksList';

export const metadata = {
  title: 'Books',
  description:
    'Books Arnav Chandra has read, with ratings and notes: spanning health, technology, psychology, and personal growth.',
  alternates: { canonical: 'https://arnavchandra.com/books' },
};

// Star ratings only appear on finished books, which now render inside
// BooksList — the "Now Reading" block below still needs the genre tags.
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
    <div className="max-w-3xl xl:max-w-4xl mx-auto sm:px-0 px-2" style={{ overflowX: 'hidden' }}>
      <h1 className="font-poppins font-semibold text-4xl mb-2 tracking-tight" style={{ color: 'var(--fg)' }}>
        Books
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--fg-dim)' }}>
        Everything I&apos;ve read, with personal notes and ratings.
      </p>

      {/* ── Currently Reading ── */}
      {currentlyReading.length > 0 && (
        <section className="mb-10">
          <h2 className="font-poppins font-semibold text-sm mb-3 tracking-widest uppercase" style={{ color: 'var(--fg-eyebrow)' }}>
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
                      alt={`Cover of ${book.frontmatter.title}`}
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

      {/* ── Read books list (sortable / filterable) ── */}
      <BooksList items={listItems} />
    </div>
  );
}
