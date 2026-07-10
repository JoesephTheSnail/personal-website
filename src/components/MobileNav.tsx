'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaHome, FaFolder, FaBook,
  FaNewspaper, FaHeartbeat, FaBars, FaTimes,
} from 'react-icons/fa';
import { HiArrowUpRight } from 'react-icons/hi2';

const nav = [
  { href: '/',                               label: 'Home',       icon: FaHome,      external: false },
  { href: '/projects',                       label: 'Projects',   icon: FaFolder,    external: false },
  { href: '/books',                          label: 'Books',      icon: FaBook,      external: false },
  { href: '/health',                         label: 'Health',     icon: FaHeartbeat, external: false },
  { href: 'https://arnav01.substack.com/',   label: 'Newsletter', icon: FaNewspaper, external: true  },
];

interface Props { onContactClick: () => void; }

type MenuState = 'closed' | 'open' | 'closing';

export default function MobileNav({ onContactClick }: Props) {
  const [menuState, setMenuState] = useState<MenuState>('closed');
  const [openKey, setOpenKey]     = useState(0);
  const [mounted, setMounted]     = useState(false);
  const pathname   = usePathname();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const close = () => {
    setMenuState(current => {
      if (current === 'closed') return 'closed';
      closeTimer.current = setTimeout(() => setMenuState('closed'), 180);
      return 'closing';
    });
  };

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenKey(k => k + 1); // force fresh mount so animation always restarts cleanly
    setMenuState('open');
  };

  useEffect(() => { close(); }, [pathname]);

  useEffect(() => {
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, []);

  // Close on outside tap
  useEffect(() => {
    if (menuState !== 'open') return;
    const handler = (e: MouseEvent) => {
      const menu = document.getElementById('mobile-menu-panel');
      if (menu && !menu.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuState]);

  const isActive = (href: string, external: boolean) =>
    !external && (pathname === href || (href !== '/' && pathname.startsWith(href)));

  const open    = menuState === 'open';
  const visible = menuState !== 'closed';

  const animStyle = open
    ? { animation: 'bubble-in 0.42s cubic-bezier(0.34, 1.25, 0.64, 1) forwards' }
    : { animation: 'bubble-out 0.18s ease-in forwards' };

  const panel = visible ? (
    <div
      key={openKey}
      id="mobile-menu-panel"
      style={{
        position:        'fixed',
        top:             '5rem',
        left:            '50%',
        width:           'calc(100% - 2.5rem)',
        maxWidth:        '340px',
        zIndex:          50,
        background:      'var(--sidebar-bg)',
        border:          '1px solid var(--border-med)',
        borderRadius:    '20px',
        boxShadow:       '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)',
        padding:         '8px',
        transformOrigin: 'top center',
        ...animStyle,
      }}
    >
      {nav.map(({ href, label, icon: Icon, external }, i) => {
        const active = isActive(href, external);
        return (
          <Link
            key={href}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            onClick={() => close()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{
              color:      active ? 'var(--fg)' : 'var(--fg-50)',
              background: active ? 'var(--hover-bg)' : 'transparent',
              // items start transparent and fade in; during close they stay visible (panel handles exit)
              opacity:    open ? 0 : 1,
              animation:  open ? `item-in 0.28s ease forwards ${80 + i * 40}ms` : 'none',
            }}
          >
            <Icon size={13} style={{ color: active ? 'var(--indigo)' : 'var(--fg-35)' }} />
            {label}
            {external && <HiArrowUpRight size={11} className="ml-auto" style={{ color: 'var(--fg-35)' }} />}
          </Link>
        );
      })}

      <div className="my-2 mx-1" style={{ height: '1px', background: 'var(--border)' }} />

      <button
        onClick={() => { close(); onContactClick(); }}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
        style={{
          background: 'var(--indigo-bg)',
          border:     '1px solid var(--indigo-border)',
          color:      'var(--indigo)',
          opacity:    open ? 0 : 1,
          animation:  open ? `item-in 0.28s ease forwards ${80 + nav.length * 40}ms` : 'none',
        }}
      >
        Contact
      </button>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => {
          if (menuState === 'open') close();
          else openMenu();
        }}
        className="p-1 transition-all duration-200"
        style={{
          color:     'var(--fg-50)',
          transform: open ? 'rotate(90deg) scale(0.9)' : 'rotate(0deg) scale(1)',
        }}
        aria-label="Open menu"
      >
        {open ? <FaTimes size={16} /> : <FaBars size={18} />}
      </button>

      {mounted && createPortal(panel, document.body)}
    </>
  );
}
