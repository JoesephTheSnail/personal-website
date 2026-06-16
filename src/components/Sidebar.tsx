'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaHome, FaFolder, FaBook, FaEnvelope,
  FaNewspaper, FaHeartbeat,
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

export default function Sidebar({ onContactClick }: Props) {
  const pathname = usePathname();

  const linkClass = (active: boolean) =>
    `sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
      active
        ? 'sidebar-link-active text-white bg-white/8'
        : 'text-white/50 hover:text-white hover:bg-white/8'
    }`;

  return (
    <aside
      className="sidebar-root hidden lg:flex flex-col fixed top-4 left-4 z-30 w-56 py-8 px-4"
      style={{
        background: 'var(--sidebar-bg)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        height: 'calc(100vh - 2rem)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <Link
        href="/"
        className="sidebar-name font-poppins font-semibold text-white text-lg mb-10 block hover:text-white transition-colors tracking-tight"
      >
        Arnav Chandra
      </Link>

      <nav className="flex flex-col gap-1 flex-1">
        {nav.map(({ href, label, icon: Icon, external }) => {
          const active = !external && pathname === href;
          return (
            <Link
              key={href}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              className={linkClass(active)}
            >
              <Icon size={15} className={`sidebar-icon ${active ? 'sidebar-icon-active text-white' : 'text-white/35'}`} />
              {label}
              {external && <HiArrowUpRight size={12} className="ml-auto text-white/40" />}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1">
        <SidebarSubscribe />
        <button
          onClick={onContactClick}
          className="sidebar-link flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium text-white/50 hover:text-white hover:bg-white/8 transition-all duration-150 w-full"
        >
          <FaEnvelope size={15} className="sidebar-icon text-white/35" />
          Contact
        </button>
      </div>
    </aside>
  );
}
