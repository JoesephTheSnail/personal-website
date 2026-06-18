'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HiArrowUpRight, HiArrowRight } from 'react-icons/hi2';
import { FaHome, FaFolder, FaBook, FaHeartbeat, FaNewspaper, FaEnvelope } from 'react-icons/fa';
import ThemeToggle from './ThemeToggle';
import MobileNav from './MobileNav';

const nav = [
  { href: '/',                             label: 'Home',       icon: FaHome,      external: false },
  { href: '/projects',                     label: 'Projects',   icon: FaFolder,    external: false },
  { href: '/books',                        label: 'Books',      icon: FaBook,      external: false },
  { href: '/health',                       label: 'Health',     icon: FaHeartbeat, external: false },
  { href: 'https://arnav01.substack.com/', label: 'Newsletter', icon: FaNewspaper, external: true  },
];

const SPRING = '0.38s cubic-bezier(0.34, 1.15, 0.64, 1)';

interface Props { onContactClick: () => void; }

export default function TopNav({ onContactClick }: Props) {
  const pathname     = usePathname();
  const navRef       = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [email, setEmail]   = useState('');
  const [sent,  setSent]    = useState(false);

  // Spring indicator — vertical axis
  useEffect(() => {
    const nav = navRef.current;
    const ind = indicatorRef.current;
    if (!nav || !ind) return;

    const active = nav.querySelector('.topnav-link--active') as HTMLElement | null;
    if (!active) { ind.style.opacity = '0'; return; }

    const navRect = nav.getBoundingClientRect();
    const elRect  = active.getBoundingClientRect();

    ind.style.transition = 'none';
    ind.style.top        = `${elRect.top - navRect.top}px`;
    ind.style.height     = `${elRect.height}px`;
    ind.style.opacity    = '1';

    requestAnimationFrame(() => {
      ind.style.transition = `top ${SPRING}`;
    });
  }, [pathname]);

  const onLinkEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const nav = navRef.current;
    const ind = indicatorRef.current;
    if (!nav || !ind) return;
    const navRect = nav.getBoundingClientRect();
    const elRect  = e.currentTarget.getBoundingClientRect();
    ind.style.opacity = '1';
    ind.style.top     = `${elRect.top - navRect.top}px`;
    ind.style.height  = `${elRect.height}px`;
  };

  const onNavLeave = () => {
    const nav = navRef.current;
    const ind = indicatorRef.current;
    if (!nav || !ind) return;
    const active = nav.querySelector('.topnav-link--active') as HTMLElement | null;
    if (!active) { ind.style.opacity = '0'; return; }
    const navRect = nav.getBoundingClientRect();
    const elRect  = active.getBoundingClientRect();
    ind.style.top    = `${elRect.top - navRect.top}px`;
    ind.style.height = `${elRect.height}px`;
  };

  const isActive = (href: string, external: boolean) =>
    !external && (pathname === href || (href !== '/' && pathname.startsWith(href)));

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    window.open(
      `https://arnav01.substack.com/subscribe?email=${encodeURIComponent(email.trim())}`,
      '_blank',
    );
    setSent(true);
    setEmail('');
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <>
      {/* ── Desktop vertical sidebar ── */}
      <div
        className="fixed left-4 top-4 bottom-4 z-40 hidden md:flex flex-col"
        style={{
          width: '260px',
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--border-med)',
          borderRadius: '20px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.5), 0 1px 6px rgba(0,0,0,0.4)',
          padding: '20px 16px 16px',
        }}
      >
        {/* Wordmark row */}
        <div className="flex items-center justify-between mb-10 px-1">
          <Link
            href="/"
            className="font-poppins font-bold text-lg tracking-tight leading-tight"
            style={{ color: 'var(--fg)' }}
          >
            Arnav Chandra
          </Link>
          <ThemeToggle />
        </div>

        {/* Nav links with spring indicator */}
        <div
          ref={navRef}
          className="relative flex flex-col gap-0.5"
          onMouseLeave={onNavLeave}
        >
          <div
            ref={indicatorRef}
            className="absolute left-0 w-full pointer-events-none rounded-xl"
            style={{
              background: 'var(--hover-bg)',
              opacity: 0,
              top: 0,
              height: 0,
              transition: `top ${SPRING}`,
            }}
          />
          {nav.map(({ href, label, icon: Icon, external }) => {
            const active = isActive(href, external);
            return (
              <Link
                key={href}
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                onMouseEnter={onLinkEnter}
                className={`topnav-link relative z-10 flex items-center gap-3 px-3 py-3 rounded-xl text-[0.9375rem] transition-colors duration-150${active ? ' topnav-link--active' : ''}`}
                style={{ color: active ? 'var(--fg)' : 'var(--fg-dim)' }}
              >
                <Icon size={16} style={{ flexShrink: 0, opacity: active ? 1 : 0.5 }} />
                <span className={active ? 'font-medium' : ''}>{label}</span>
                {external && <HiArrowUpRight size={11} className="ml-auto" style={{ color: 'var(--indigo)', opacity: 0.75 }} />}
              </Link>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Newsletter subscribe */}
        <div className="px-1 mb-5">
          <p
            className="text-[11px] font-semibold mb-2.5"
            style={{ color: 'var(--fg-dim)' }}
          >
            {sent ? 'Opening Substack…' : 'Follow for Monthly Updates'}
          </p>
          <form onSubmit={handleSubscribe} className="flex gap-1.5">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Your email"
              className="flex-1 min-w-0 text-xs px-2.5 py-2 rounded-lg outline-none"
              style={{
                background: 'var(--input-bg, rgba(255,255,255,0.06))',
                border: '1px solid var(--border)',
                color: 'var(--fg)',
              }}
            />
            <button
              type="submit"
              className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
              style={{
                background: 'var(--hover-bg)',
                border: '1px solid var(--border-med)',
                color: 'var(--fg)',
              }}
            >
              <HiArrowRight size={13} />
            </button>
          </form>
        </div>

        {/* Separator */}
        <div className="mx-1 mb-3" style={{ height: '1px', background: 'var(--border)' }} />

        {/* Contact */}
        <button
          onClick={onContactClick}
          className="contact-glow-btn w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium"
          style={{ color: 'var(--fg-dim)' }}
        >
          <FaEnvelope size={13} style={{ opacity: 0.6 }} />
          Contact
        </button>
      </div>

      {/* ── Mobile top pill ── */}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-40 md:hidden flex items-center h-11 px-4 gap-3"
        style={{
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--border-med)',
          borderRadius: '9999px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3)',
          width: 'calc(100% - 2.5rem)',
          maxWidth: '340px',
        }}
      >
        <Link
          href="/"
          className="font-poppins font-semibold text-sm tracking-tight flex-1 whitespace-nowrap"
          style={{ color: 'var(--fg)' }}
        >
          Arnav Chandra
        </Link>
        <MobileNav onContactClick={onContactClick} />
      </div>
    </>
  );
}
