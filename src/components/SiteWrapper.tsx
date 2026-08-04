'use client';

import { useEffect, useState } from 'react';
import TopNav from './TopNav';
import ContactModal from './ContactModal';

export default function SiteWrapper({ children }: { children: React.ReactNode }) {
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    const handler = () => setContactOpen(true);
    window.addEventListener('open-contact', handler);
    return () => window.removeEventListener('open-contact', handler);
  }, []);

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
      <a href="#main-content" className="skip-link">Skip to content</a>
      <TopNav onContactClick={() => setContactOpen(true)} />
      <main id="main-content" tabIndex={-1} className="min-h-screen pt-24 md:pt-8 pb-16 px-6 sm:px-10 md:pl-[330px] md:pr-20">
        {children}
      </main>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}
