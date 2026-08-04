import Link from 'next/link';
import ContactTrigger from '@/components/ContactTrigger';
import ProfilePhoto from '@/components/ProfilePhoto';
import NowSection from '@/components/NowSection';
import { getAllProjects } from '@/lib/projects';
import { FaBook, FaNewspaper, FaHeartbeat, FaVideo, FaLinkedin } from 'react-icons/fa';
import { FaArrowUpRightFromSquare, FaArrowRight } from 'react-icons/fa6';

const activities = [
  {
    icon: FaNewspaper,
    title: 'Writing: Mindset Matters',
    desc: "A monthly newsletter on mindset, habits, and the ideas I can't stop thinking about.",
    link: 'https://arnav01.substack.com/',
    bg:     'var(--amber-bg)',
    border: 'var(--amber-border)',
    color:  'var(--amber)',
  },
  {
    icon: FaBook,
    title: 'Reading',
    desc: 'Mostly non-fiction: psychology, habits, and human behaviour.',
    link: '/books',
    bg:     'var(--indigo-bg)',
    border: 'var(--indigo-border)',
    color:  'var(--indigo)',
  },
  {
    icon: FaHeartbeat,
    title: 'Training',
    desc: 'Lifting 4–5x a week and researching optimal strategies for strength and recovery.',
    bg:     'var(--emerald-bg)',
    border: 'var(--emerald-border)',
    color:  'var(--emerald)',
  },
  {
    icon: FaVideo,
    title: 'Documenting',
    desc: 'Posting on my gym page and tracking the process.',
    link: 'https://www.tiktok.com/@arnav.gym',
    bg:     'var(--rose-bg)',
    border: 'var(--rose-border)',
    color:  'var(--rose)',
  },
] satisfies {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  title: string;
  desc: string;
  link?: string;
  bg: string;
  border: string;
  color: string;
}[];

export default function HomePage() {
  const nowItems = getAllProjects()
    .filter((p) => p.frontmatter.status === 'upcoming')
    .map((p) => ({
      slug: p.slug,
      title: p.frontmatter.title,
      description: p.frontmatter.description,
      category: p.frontmatter.category ?? 'Other',
    }));

  return (
    <div className="max-w-2xl xl:max-w-3xl mx-auto">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center gap-6 mb-6">
          {/* Photo — perspective tilt handled in its own client component */}
          <ProfilePhoto />
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1
                className="font-poppins font-semibold text-2xl sm:text-[1.75rem] tracking-tight leading-tight"
                style={{ color: 'var(--fg)' }}
              >
                Arnav Chandra
              </h1>
              <a
                href="https://www.linkedin.com/in/arnav-chandra-b33660293/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Arnav Chandra on LinkedIn"
                className="linkedin-link flex-shrink-0"
                style={{ color: 'var(--fg-dim)' }}
              >
                <FaLinkedin size={18} />
              </a>
            </div>
            <p className="text-sm" style={{ color: 'var(--fg-dim)' }}>
              Toronto, Ontario
            </p>
            <Link
              href="/projects"
              className="positioning-link group mt-2.5 inline-block text-[13px]"
              style={{ color: 'var(--fg-60)' }}
            >
              Building at the intersection of health and technology — see the work{' '}
              <FaArrowRight
                size={9}
                className="inline-block transition-transform duration-200 group-hover:translate-x-0.5"
                style={{ verticalAlign: 'middle' }}
              />
            </Link>
          </div>
        </div>
      </div>


      {/* ── Bio ────────────────────────────────────────── */}
      <div
        className="space-y-4 text-[0.9375rem] leading-loose mb-10"
        style={{ color: 'var(--fg-70)' }}
      >
        <p>
          I&apos;m a high school student from Toronto. Got into health and technology early,
          and just never stopped. My first real project was MindSet, a mental wellness app for
          teenagers, built before I really knew what I was doing.
        </p>
        <p>
          Now I intern as a Junior Technical Specialist at TuffTek, do health research at NewGen
          Health, and write Mindset Matters, a monthly newsletter on mindset and growth. I&apos;ve
          shipped over a dozen projects along the way.
        </p>
        <p>
          Most of what I care about sits at the intersection of health, technology, and how people
          think. Still in high school, but I figure the best time to work on interesting problems
          is now.
        </p>
      </div>

      <hr className="mb-10" style={{ borderColor: 'var(--border)' }} />

      {/* ── What I'm doing now ─────────────────────────── */}
      <NowSection items={nowItems} />

      {/* ── How I spend my time ────────────────────────── */}
      <section className="mb-10">
        <p
          className="text-[11px] font-semibold tracking-widest uppercase mb-6"
          style={{ color: 'var(--fg-eyebrow)' }}
        >
          How I spend my time
        </p>
        <div>
          {activities.map(({ icon: Icon, title, desc, link, bg, border, color }, i) => (
            <div
              key={i}
              className="spring-slide flex items-start gap-4 py-5"
              style={{
                borderBottom:
                  i < activities.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: bg, border: `1px solid ${border}` }}
              >
                <Icon size={14} style={{ color }} />
              </div>
              <div>
                <div className="font-medium text-sm mb-1" style={{ color: 'var(--fg)' }}>
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline underline-offset-2"
                    >
                      {title}
                    </a>
                  ) : (
                    title
                  )}
                </div>
                <div
                  className="text-[0.875rem] leading-relaxed"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className="mb-10" style={{ borderColor: 'var(--border)' }} />

      {/* ── Want to connect ────────────────────────────── */}
      <section className="mb-6">
        <p
          className="text-[11px] font-semibold tracking-widest uppercase mb-4"
          style={{ color: 'var(--fg-eyebrow)' }}
        >
          Want to connect?
        </p>
        <p
          className="text-[0.9375rem] leading-loose mb-6"
          style={{ color: 'var(--fg-70)' }}
        >
          If any of this resonates, or you just want to talk health, technology, or ideas,
          I&apos;d love to hear from you.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <ContactTrigger
            className="spring-scale px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{
              background: 'var(--indigo-bg)',
              border: '1px solid var(--indigo-border)',
              color: 'var(--indigo)',
            }}
          >
            Get in touch
          </ContactTrigger>
          <a
            href="https://arnav01.substack.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="spring-scale px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-1.5"
            style={{
              background: 'var(--amber-bg)',
              border: '1px solid var(--amber-border)',
              color: 'var(--amber)',
            }}
          >
            Read my newsletter
            <FaArrowUpRightFromSquare size={11} />
          </a>
        </div>
      </section>

    </div>
  );
}
