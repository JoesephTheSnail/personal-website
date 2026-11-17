'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaHome } from 'react-icons/fa';
import TopNav from './TopNav';
import ContactModal from './ContactModal';

export default function SiteWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Scratch full-bleed previews (3D demos, etc.) own their whole viewport —
  // the persistent sidebar nav doesn't fit there, so they get a minimal
  // home link instead of the full site chrome.
  // A project's own full-screen demo (/projects/<slug>/demo) gets the same
  // treatment, with its back link pointing at that project's page instead.
  const demoMatch = pathname?.match(/^\/projects\/([^/]+)\/demo\/?$/);
  const isFullBleedPreview = pathname?.startsWith('/dev-preview') || Boolean(demoMatch);
  const backHref = demoMatch ? `/projects/${demoMatch[1]}` : '/';
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

  if (isFullBleedPreview) {
    return (
      <>
        <Link
          href={backHref}
          aria-label={demoMatch ? 'Back to the project page' : 'Back to home'}
          className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
        >
          {demoMatch ? <FaArrowLeft size={15} /> : <FaHome size={16} />}
        </Link>
        <main id="main-content" tabIndex={-1} className="min-h-screen">
          {children}
        </main>
      </>
    );
  }

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
