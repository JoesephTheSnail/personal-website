'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaHome, FaFolder, FaBook, FaEnvelope,
  FaNewspaper, FaHeartbeat, FaBars, FaTimes,
} from 'react-icons/fa';
import { HiArrowUpRight } from 'react-icons/hi2';
import SidebarSubscribe from './SidebarSubscribe';

const nav = [
  { href: '/',                               label: 'Home',       icon: FaHome,      external: false },
  { href: '/projects',                       label: 'Projects',   icon: FaFolder,    external: false },
  { href: '/books',                          label: 'Books',      icon: FaBook,      external: false },
  { href: '/health',                         label: 'Health',     icon: FaHeartbeat, external: false },
  { href: 'https://arnav01.substack.com/',   label: 'Newsletter', icon: FaNewspaper, external: true  },
];

interface Props { onContactClick: () => void; }

export default function MobileNav({ onContactClick }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
      active ? 'text-white bg-white/8' : 'text-white/50 hover:text-white hover:bg-white/8'
    }`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-white/60 p-1 hover:text-white transition-colors"
        aria-label="Open menu"
      >
        <FaBars size={18} />
      </button>

      {/* Always in DOM — CSS transition handles open/close instantly */}
      <div
        className="fixed inset-0 z-50 flex"
        style={{
          pointerEvents: open ? 'auto' : 'none',
          visibility: open ? 'visible' : 'hidden',
        }}
      >
        {/* Backdrop — instant dark on open, fade out on close */}
        <div
          className="flex-1"
          style={{
            background: 'rgba(0,0,0,0.6)',
            opacity: open ? 1 : 0,
            transition: open ? 'none' : 'opacity 0.22s ease',
          }}
          onClick={() => setOpen(false)}
        />

        {/* Drawer — slides in from right */}
        <div
          className="w-64 h-full flex flex-col py-8 px-5"
          style={{
            background: 'var(--sheet-bg)',
            borderLeft: '1px solid var(--border-8)',
            transform: open ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className="flex items-center justify-between mb-8">
            <span className="font-poppins font-semibold text-white text-base tracking-tight">
              Arnav Chandra
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-white/40 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <FaTimes size={16} />
            </button>
          </div>

          <nav className="flex flex-col gap-1 flex-1">
            {nav.map(({ href, label, icon: Icon, external }) => {
              const active = !external && pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  onClick={() => setOpen(false)}
                  className={linkClass(active)}
                >
                  <Icon size={14} className={active ? 'text-white' : 'text-white/30'} />
                  {label}
                  {external && <HiArrowUpRight size={12} className="ml-auto text-white/60" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-col gap-3 pt-1">
            <SidebarSubscribe />
            <button
              onClick={() => { setOpen(false); onContactClick(); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-white/50 hover:text-white hover:bg-white/8 transition-colors text-left"
            >
              <FaEnvelope size={14} className="text-white/30" />
              Contact
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
