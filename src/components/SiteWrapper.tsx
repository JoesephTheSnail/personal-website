'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaHome } from 'react-icons/fa';
import TopNav from './TopNav';
import ContactModal from './ContactModal';

export default function SiteWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Flags large text sizes (root font size 150% or more, from browser settings or the accessibility
  // menu) so the few rows that cannot fit at that size can wrap. See `big-text` in globals.css.
  useEffect(() => {
    const root = document.documentElement;
    const update = () => root.classList.toggle('big-text', parseFloat(getComputedStyle(root).fontSize) >= 24);
    update();
    window.addEventListener('resize', update);
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['style'] });
    return () => {
      window.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, []);
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

  // Dev server only. `next dev` compiles each route the first time it's
  // visited (0.5–1.2s each, measured), so the first click on Projects, Books
  // or Health stalls — and with the native cursor hidden, that stall reads
  // as a frozen mouse. Quietly requesting those pages once after load moves
  // the compile out of the click. Production has no per-route compile (pages
  // are prebuilt and prefetched), and this whole block is dead-code-eliminated
  // from the production bundle by the NODE_ENV check.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    let cancelled = false;
    const warm = async () => {
      for (const href of ['/projects', '/books', '/health', '/projects/creative', '/projects/mindset-app']) {
        if (cancelled) return;
        try { await fetch(href, { credentials: 'same-origin' }); } catch { /* dev-only, best effort */ }
      }
    };
    // After the page has settled, so the warm-up never competes with first paint.
    const t = window.setTimeout(warm, 1500);
    return () => { cancelled = true; window.clearTimeout(t); };
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
          // native-cursor: the custom cursor is off on these pages, so the
          // global cursor-hiding rule would leave this link with no cursor at all
          className="native-cursor fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
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
      <a href="#main-content" className="skip-link" data-site-chrome>Skip to content</a>
      <TopNav onContactClick={() => setContactOpen(true)} />
      <main id="main-content" tabIndex={-1} className="min-h-screen pt-24 lg:pt-8 pb-16 px-6 sm:px-10 lg:pl-[330px] lg:pr-20">
        {children}
      </main>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}
