'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaEnvelope } from 'react-icons/fa';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import ContactModal from './ContactModal';
import ThemeToggle from './ThemeToggle';

export default function SiteWrapper({ children }: { children: React.ReactNode }) {
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    const handler = () => setContactOpen(true);
    window.addEventListener('open-contact', handler);
    return () => window.removeEventListener('open-contact', handler);
  }, []);

  // Haptic feedback on interactive elements (Android via Vibration API)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!navigator.vibrate) return;
      const target = e.target as HTMLElement;
      if (target.closest('a, button, [role="button"]')) {
        navigator.vibrate(8);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="mobile-topbar lg:hidden sticky top-0 z-40 flex items-center justify-between px-6 py-4"
        style={{ background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--border)' }}
      >
        <Link href="/" className="font-poppins font-semibold text-base tracking-tight" style={{ color: 'var(--fg)' }}>
          Arnav Chandra
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setContactOpen(true)}
            className="p-2 transition-colors"
            style={{ color: 'var(--fg-dim)' }}
            aria-label="Contact"
          >
            <FaEnvelope size={15} />
          </button>
          <MobileNav onContactClick={() => setContactOpen(true)} />
        </div>
      </div>

      {/* Theme toggle — fixed top-right on desktop */}
      <div className="hidden lg:block fixed top-5 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="flex min-h-screen">
        <Sidebar onContactClick={() => setContactOpen(true)} />
        <main className="flex-1 min-w-0 overflow-x-hidden lg:ml-64 min-h-screen py-14 lg:py-20 px-6 sm:px-8 lg:px-10">
          {children}
        </main>
      </div>

      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}
