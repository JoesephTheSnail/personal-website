'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MobileNav from './MobileNav';
import { NAV_ITEMS, isNavActive } from '@/lib/navItems';
import { playTick, playSuccess } from '@/lib/sound';
import { LINKS } from '@/lib/links';

interface Props { onContactClick: () => void; }

export default function TopNav({ onContactClick }: Props) {
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    window.open(
      `${LINKS.substackSubscribe}?email=${encodeURIComponent(email.trim())}`,
      '_blank',
      'noopener,noreferrer',
    );
    playSuccess();
    setSent(true);
    setEmail('');
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <>
      {/* ── Desktop sidebar: a flush column with one hairline edge, set in the
          same plain type as the pages. No card, no icons, no moving pill. ── */}
      <aside
        data-site-chrome
        className="fixed inset-y-0 left-0 z-40 hidden w-[270px] flex-col overflow-y-auto border-r px-8 pb-8 pt-10 lg:flex"
        style={{ background: 'var(--bg)', borderColor: 'var(--border-med)' }}
      >
        <Link href="/" className="tap-44 text-[1.375rem] font-medium leading-tight tracking-[-0.03em]" style={{ color: 'var(--fg)' }}>
          Arnav Chandra
        </Link>
        <p className="mt-2 text-[10.5px] uppercase tracking-[0.14em]" style={{ color: 'var(--fg-60)' }}>
          Toronto, Ontario
        </p>

        <nav aria-label="Main" className="mt-14">
          <ul>
            {NAV_ITEMS.map((item, i) => {
              const active = isNavActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => !active && playTick()}
                    className="tap-44 rail-link flex items-baseline gap-3 py-2 text-[1.125rem] tracking-[-0.015em]"
                    style={{ color: active ? 'var(--accent)' : 'var(--fg-70)' }}
                  >
                    <span className="w-5 text-[10.5px] tabular-nums" style={{ color: active ? 'var(--accent)' : 'var(--fg-45)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {item.label}
                    {item.external && <span aria-hidden="true" className="text-[0.8em]">↗</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto">
          <button
            type="button"
            onClick={onContactClick}
            className="tap-44 proud-link pb-1 text-[0.9375rem]"
            style={{ color: 'var(--fg)' }}
          >
            Get in touch <span aria-hidden="true">→</span>
          </button>

          <div className="mt-8 border-t pt-5" style={{ borderColor: 'var(--border-med)' }}>
            <label htmlFor="sidebar-email" className="text-[10.5px] uppercase tracking-[0.14em]" style={{ color: 'var(--fg-60)' }}>
              {sent ? 'Opening Substack…' : 'Monthly newsletter'}
            </label>
            <form onSubmit={handleSubscribe} className="sidebar-form mt-3 flex items-baseline gap-3 border-b pb-2" style={{ borderColor: 'var(--border-med)' }}>
              <input
                id="sidebar-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="sidebar-input min-w-0 flex-1 bg-transparent text-[0.875rem] outline-none"
                style={{ color: 'var(--fg)' }}
              />
              <button type="submit" aria-label="Subscribe" className="tap-44 rail-link text-[0.875rem]" style={{ color: 'var(--fg-70)' }}>
                Join <span aria-hidden="true">→</span>
              </button>
            </form>
          </div>

          <p className="mt-6 text-[10px]" style={{ color: 'var(--fg-45)' }}>
            © {new Date().getFullYear()} Arnav Chandra
          </p>
        </div>
      </aside>

      {/* ── Mobile bar: solid and full width, so page text never shows through it.
          The menu button sits on the left, directly before the name, so the two read as one
          mark (menu, then who this is) and the thumb reaches it on the side most phones are
          held from. ── */}
      <div
        data-site-chrome
        className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b px-5 lg:hidden"
        style={{ background: 'var(--bg)', borderColor: 'var(--border-med)' }}
      >
        <MobileNav onContactClick={onContactClick} />
        <Link
          href="/"
          className="tap-44 flex-1 whitespace-nowrap text-[1.0625rem] font-medium tracking-[-0.02em]"
          style={{ color: 'var(--fg)' }}
        >
          Arnav Chandra
        </Link>
      </div>
    </>
  );
}
