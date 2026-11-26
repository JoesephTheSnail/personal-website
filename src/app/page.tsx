import Link from 'next/link';
import Image from 'next/image';
import ContactActions from '@/components/ContactActions';
import ProfilePhoto from '@/components/ProfilePhoto';
import NowSection from '@/components/NowSection';
import { getAllProjects } from '@/lib/projects';
import { getAllBooks } from '@/lib/books';
import { LINKS } from '@/lib/links';
import { FaLinkedin } from 'react-icons/fa';
import { eyebrow } from '@/components/typeClasses';

// The three projects I'm proudest of. Deliberately given identical treatment —
// same image size, same type, same position on the baseline — so none reads as
// first, second or third. They're three different disciplines, which is the
// point: Research, Engineering, Product.
const PROUDEST = [
  {
    slug: 'screens-and-sleep-report',
    title: 'Pre-Sleep Screen Restriction',
    cta: 'View report',
    image: '/home/sleep-study.jpg',
    alt: 'Pages from the pre-sleep screen restriction report, showing results tables and charts.',
  },
  {
    slug: 'carbon-capture-model',
    title: 'Truck Exhaust Carbon Capture',
    cta: 'View model',
    image: '/home/carbon-capture-unit.jpg',
    alt: 'Exploded 3D view of the carbon capture unit, showing the demister pad, de-tox chamber, amine pools and storage bin.',
  },
  {
    slug: 'mindset-app',
    title: 'MindSet Wellness App',
    cta: 'View app',
    image: '/home/mindset.jpg',
    alt: 'Two screens from the MindSet app prototype on a petrol blue background.',
  },
];

// Everything I'm juggling at the moment, in the spirit of a /now page: the big
// picture, not a task list. Grouped loosely (what I'm elected to, what I run,
// what I get paid for, what I write) and shown as a plain ruled list: the length
// of it is the point, so it's left to speak for itself. Bump UPDATED when it changes.
const UPDATED = 'November 2026';
const ON_MY_PLATE: { title: string; note?: string }[] = [
  { title: 'CFO', note: 'Student Council' },
  { title: 'VP of Communications', note: 'DECA' },
  { title: 'Director of Assembly', note: 'School' },
  { title: 'Trivia club founder', note: 'Runs weekly' },
  { title: 'Podcast Club Lead', note: "St. Jude's" },
  { title: 'Swim instructor and lifeguard', note: 'Aquatics' },
  { title: 'Monthly newsletter', note: 'Mindset Matters' },
];

/** Staggers the entrance animation (.rise in globals.css). */
const delay = (ms: number) => ({ ['--d' as string]: `${ms}ms` }) as React.CSSProperties;


// Label column is exactly the photo's width, so body text lines up with the name.
const row = 'sm:grid sm:grid-cols-[216px_1fr] sm:gap-x-14';

export default function HomePage() {
  const projects = getAllProjects();
  // The book being read right now (status: reading), shown under "Now" so the label has a second line of truth.
  const reading = getAllBooks().find((b) => b.frontmatter.status === 'reading');
  const proudest = PROUDEST.map((item) => {
    const project = projects.find((p) => p.slug === item.slug);
    return {
      ...item,
      discipline: project?.frontmatter.category ?? '',
      year: (project?.frontmatter.date ?? '').split('-')[0],
    };
  });

  const nowItems = projects
    .filter((p) => p.frontmatter.status === 'upcoming')
    .map((p) => ({
      slug: p.slug,
      title: p.frontmatter.title,
      description: p.frontmatter.description,
      category: p.frontmatter.category ?? 'Other',
    }));

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── Hero ───────────────────────────────────────── */}
      <header className="mb-14 sm:mb-20">
        <div className="flex flex-col sm:flex-row sm:items-center gap-9 sm:gap-x-14">
          <div className="rise" style={delay(0)}>
            <ProfilePhoto />
          </div>
          <div className="min-w-0">
            <p className={`rise ${eyebrow}`} style={{ ...delay(90), color: 'var(--fg-eyebrow)' }}>
              Toronto, Ontario
            </p>
            <h1
              className="rise mt-3 text-[clamp(2.25rem,5vw,3.5rem)] font-medium leading-[0.98] tracking-[-0.04em]"
              style={{ ...delay(150), color: 'var(--fg)' }}
            >
              Arnav Chandra
            </h1>
            <p
              className="rise mt-4 flex items-center gap-3 text-[clamp(1.05rem,1.8vw,1.25rem)] tracking-tight"
              style={{ ...delay(230), color: 'var(--fg-60)' }}
            >
              Student, builder, and writer.
              <a
                href={LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Arnav Chandra on LinkedIn"
                className="tap-44 linkedin-link flex-shrink-0"
                style={{ color: 'var(--fg-dim)' }}
              >
                <FaLinkedin size={19} />
              </a>
            </p>
            {/* The two actions that also close the page, repeated here so a
                phone visitor sees them on the first screen without opening
                the menu. Same links, same wording. */}
            <div className="rise mt-6 flex flex-wrap items-baseline gap-x-8 gap-y-3" style={delay(290)}>
              <ContactActions size="md" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Bio + coming up: text aligns with the name above, label column with the photo ── */}
      <section className={`rise ${row} mb-14`} style={delay(320)}>
        <h2 className={`${eyebrow} mb-4 sm:mb-0 sm:pt-[0.55rem]`} style={{ color: 'var(--fg-eyebrow)' }}>About</h2>
        <div className="space-y-5">
          <p className="text-[clamp(1.15rem,2vw,1.35rem)] leading-[1.55] tracking-[-0.01em]" style={{ color: 'var(--fg)' }}>
            I&apos;m a high school student from Toronto. Got into health and technology early,
            and it really hooked me. My first real project was
            MindSet, a mental wellness app for teenagers, built before I really knew what I was
            doing.
          </p>
          <p className="text-[0.9375rem] leading-[1.8]" style={{ color: 'var(--fg-70)' }}>
            Right now I&apos;m focused on carbon capture and building 3D models, and I write Mindset
            Matters, a monthly newsletter on mindset and growth. I&apos;ve shipped over a dozen
            projects along the way.
          </p>
          <p className="text-[0.9375rem] leading-[1.8]" style={{ color: 'var(--fg-70)' }}>
            Most of what I care about comes down to health, technology, and how people
            think. Still in high school, but I figure the best time to work on interesting problems
            is now.
          </p>
        </div>
      </section>

      {nowItems.length > 0 && (
        <section className={`${row} mb-14`} aria-labelledby="coming-up-heading">
          <h2 id="coming-up-heading" className={`${eyebrow} mb-4 sm:mb-0 sm:pt-[0.55rem]`} style={{ color: 'var(--fg-eyebrow)' }}>
            Coming up
          </h2>
          <NowSection items={nowItems} />
        </section>
      )}

      {/* ── Proudest work ──────────────────────────────── */}
      <section className="mt-6 mb-20" aria-labelledby="proudest-heading">
        <div className="flex items-baseline justify-between pt-4 mb-7 border-t-2" style={{ borderColor: 'var(--fg)' }}>
          <h2 id="proudest-heading" className={eyebrow} style={{ color: 'var(--fg)' }}>
            Three projects I&apos;m proudest of
          </h2>
          <Link href="/projects" className="tap-44 text-xs hover:underline underline-offset-2" style={{ color: 'var(--fg-60)' }}>
            All projects
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-12">
          {proudest.map((item) => (
            <Link key={item.slug} href={`/projects/${item.slug}`} className="proud-card group block">
              <div
                className="relative overflow-hidden aspect-[4/3] sm:aspect-[4/5]"
                style={{ background: 'var(--card-bg)' }}
              >
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 1024px) 280px, (min-width: 640px) 30vw, 100vw"
                  className="proud-zoom object-cover"
                />
              </div>
              <h3
                className="mt-4 text-[1.125rem] font-normal leading-snug tracking-[-0.015em]"
                style={{ color: 'var(--fg)' }}
              >
                {item.title}
              </h3>
              <p className="mt-1.5 text-[10.5px] uppercase tracking-[0.14em]" style={{ color: 'var(--fg-60)' }}>
                {item.discipline} / {item.year}
              </p>
              <span className="proud-link mt-3 inline-block pb-1 text-[13px]" style={{ color: 'var(--fg)' }}>
                {item.cta} <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Now ────────────────────────────────── */}
      <section className={`${row} mb-14`} aria-labelledby="plate-heading">
        <div className="mb-4 sm:mb-0 sm:pt-[0.55rem] sm:text-center">
          <h2 id="plate-heading" className={`${eyebrow} flex items-center gap-2 sm:justify-center`} style={{ color: 'var(--fg-eyebrow)' }}>
            <span className="inline-flex h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} aria-hidden="true" />
            Now
          </h2>
          <p className="mt-3 text-[10.5px] uppercase tracking-[0.14em]" style={{ color: 'var(--fg-45)' }}>
            Updated {UPDATED}
          </p>
          {reading && (
            <Link href="/books" className="book-lift mx-auto mt-8 hidden w-[9.5rem] text-center sm:block" aria-label={`Currently reading ${reading.frontmatter.title} by ${reading.frontmatter.author}`}>
              <span className="book-lift__cover mx-auto block w-[114px]">
                <Image
                  src={reading.frontmatter.cover}
                  alt=""
                  width={228}
                  height={342}
                  sizes="114px"
                  className="mx-auto h-[171px] w-[114px] object-cover"
                />
              </span>
              <span className="mt-4 block text-[10.5px] uppercase tracking-[0.14em]" style={{ color: 'var(--fg-60)' }}>Reading</span>
              <span className="proud-link mt-1.5 inline text-[0.9375rem] leading-snug tracking-[-0.01em]" style={{ color: 'var(--fg)' }}>{reading.frontmatter.title}</span>
              <span className="mt-1 block text-[0.8125rem]" style={{ color: 'var(--fg-dim)' }}>{reading.frontmatter.author}</span>
            </Link>
          )}
        </div>
        <ul className="border-t" style={{ borderColor: 'var(--border-med)' }}>
          {ON_MY_PLATE.map((item) => (
            <li key={item.title} className="row-wrap flex items-baseline gap-4 border-b py-3" style={{ borderColor: 'var(--border-med)' }}>
              <span className="text-[1.125rem] tracking-[-0.015em]" style={{ color: 'var(--fg)' }}>{item.title}</span>
              {/* Dotted leader, the same device as the Projects and Health lists. */}
              <span className="min-w-6 flex-1 -translate-y-[0.3rem] border-b border-dotted" style={{ borderColor: 'var(--fg-30)' }} aria-hidden="true" />
              {item.note && (
                <span className="flex-shrink-0 text-right text-[10.5px] uppercase tracking-[0.14em]" style={{ color: 'var(--fg-60)' }}>
                  {item.note}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Want to connect ────────────────────────────── */}
      <section className="mb-8 pt-8 border-t" style={{ borderColor: 'var(--border-med)' }}>
        <p className={`${eyebrow} mb-5`} style={{ color: 'var(--fg-eyebrow)' }}>
          Want to connect?
        </p>
        <p
          className="max-w-2xl text-[clamp(1.5rem,3.2vw,2.15rem)] leading-[1.2] tracking-[-0.025em] mb-8"
          style={{ color: 'var(--fg)' }}
        >
          If any of this sounds interesting, or you just want to talk health, technology, or ideas,{' '}
          <span style={{ color: 'var(--accent)' }}>I&apos;d love to hear from you.</span>
        </p>
        <div className="flex flex-wrap items-baseline gap-x-10 gap-y-4">
          <ContactActions />
        </div>
      </section>

    </div>
  );
}
