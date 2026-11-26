'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LINKS } from '@/lib/links';

// The 404 page is a small game that fills the whole screen: the lights are out and your cursor (or
// finger) is the flashlight. Five things are lying around in the dark; finding all five turns the
// lights on. Two of the things are exits (a door home, a boomerang back), and a lit panel at the
// bottom always has the real links. Borrowed from the best 404s: a joke built from the page's own
// situation (LEGO), something to poke at (Android), a comic voice (Distilled) and a useful way
// out (Dribbble). The dark is decoration: everything is real text or a real button, and with
// reduced motion the light sits still.
type Thing = { id: string; label: string; caption: string; x: number; y: number; r: number; icon: React.ReactNode; exit?: 'home' | 'back' };

const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const THINGS: Thing[] = [
  {
    id: 'sock', label: 'a sock', x: 13, y: 24, r: -14,
    caption: 'One left sock. Not the page, but it explains a lot about the laundry situation.',
    icon: <svg viewBox="0 0 48 48" {...STROKE}><path d="M17 6h14v22l10 8c3 3 0 8-4 8H21c-5 0-8-4-8-9V6z" /><path d="M17 14h14" /></svg>,
  },
  {
    id: 'clip', label: 'a paperclip', x: 79, y: 20, r: 18,
    caption: 'A paperclip. So that is where they all go.',
    icon: <svg viewBox="0 0 48 48" {...STROKE}><path d="M30 12 14 28a7 7 0 0 0 10 10l17-17a11 11 0 0 0-15-15L9 24" /></svg>,
  },
  {
    id: 'cone', label: 'a traffic cone', x: 88, y: 56, r: -6,
    caption: 'A traffic cone. We are "working on it". Have been for a while.',
    icon: <svg viewBox="0 0 48 48" {...STROKE}><path d="M24 6 36 38H12L24 6z" /><path d="M19 22h10M16 30h16M8 42h32" /></svg>,
  },
  {
    id: 'mug', label: 'a coffee', x: 20, y: 62, r: 8,
    caption: 'A coffee, still warm. Whoever lost the page left in a hurry.',
    icon: <svg viewBox="0 0 48 48" {...STROKE}><path d="M9 16h26v16a8 8 0 0 1-8 8H17a8 8 0 0 1-8-8V16z" /><path d="M35 20h3a5 5 0 0 1 0 10h-3" /><path d="M17 5v5M24 5v5M31 5v5" /></svg>,
  },
  {
    id: 'page', label: 'another page', x: 60, y: 70, r: -10,
    caption: 'A page! Not yours. This one is a rival, and it is smug about it.',
    icon: <svg viewBox="0 0 48 48" {...STROKE}><path d="M11 5h20l8 8v30H11z" /><path d="M31 5v8h8" /><path d="M19 28c0-4 3-6 6-6s5 2 5 4c0 4-5 4-5 8" /><path d="M25 38v.5" strokeWidth={4.5} /></svg>,
  },
  // Exits: not counted, but they are the way out. Found by light like everything else.
  {
    id: 'door', label: 'a door home', x: 38, y: 17, r: 0, exit: 'home',
    caption: 'A door. It says HOME on it. Going in.',
    icon: <svg viewBox="0 0 48 48" {...STROKE}><path d="M12 42V8h24v34" /><path d="M6 42h36" /><circle cx="30" cy="26" r="1.8" fill="currentColor" /></svg>,
  },
  {
    id: 'boomerang', label: 'a boomerang, takes you back', x: 70, y: 44, r: 12, exit: 'back',
    caption: 'A boomerang. It only knows one trick: back where you came from.',
    icon: <svg viewBox="0 0 48 48" {...STROKE}><path d="M8 36C10 18 22 8 40 10c-8 4-14 10-14 20 0 4 2 6 4 8-8 0-16 0-22-2z" /></svg>,
  },
];

const COUNTED = THINGS.filter((t) => !t.exit).length;

const LINKS_ROW = [
  { label: 'Home', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'Books', href: '/books' },
  { label: 'Health', href: '/health' },
  { label: 'Newsletter', href: LINKS.substack, external: true },
] as const;

export default function LostInTheDark() {
  const routePath = usePathname();
  // The address is only known for sure in the browser, so show it after mount (server and first client render match).
  const [pathname, setPathname] = useState('');
  useEffect(() => setPathname(routePath || window.location.pathname), [routePath]);
  const router = useRouter();
  const roomRef = useRef<HTMLDivElement>(null);
  const driftRef = useRef(true);
  const [found, setFound] = useState<string[]>([]);
  const [caption, setCaption] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [doing, setDoing] = useState<string | null>(null); // the thing currently playing its click animation

  const moveLight = useCallback((x: number, y: number) => {
    const el = roomRef.current;
    if (!el) return;
    el.style.setProperty('--lx', `${x}px`);
    el.style.setProperty('--ly', `${y}px`);
  }, []);

  const motionOff = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('reduce-motion');

  // This page is the whole screen: hide the site chrome and the page scroll while it is up.
  useEffect(() => {
    document.documentElement.classList.add('is-404');
    setCanGoBack(window.history.length > 1);
    return () => document.documentElement.classList.remove('is-404');
  }, []);

  // Until the visitor moves it, the light wanders on its own, so the page is alive on touch screens too.
  useEffect(() => {
    const el = roomRef.current;
    if (!el) return;
    const place = (fx: number, fy: number) => moveLight(window.innerWidth * fx, window.innerHeight * fy);
    place(0.5, 0.35);
    if (motionOff()) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      if (!driftRef.current) return;
      const t = (now - t0) / 1000;
      place(0.5 + 0.34 * Math.sin(t * 0.55), 0.34 + 0.2 * Math.sin(t * 0.9 + 1));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [moveLight]);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    driftRef.current = false;
    moveLight(e.clientX, e.clientY);
  };

  const spot = (target: HTMLElement) => {
    driftRef.current = false;
    const r = target.getBoundingClientRect();
    moveLight(r.left + r.width / 2, r.top + r.height / 2);
  };

  const goBack = () => (window.history.length > 1 ? router.back() : router.push('/'));

  // Every thing reacts when poked. Exits play their show first (the boomerang spins away, the door swings
  // open and floods the room with light) and only then navigate; with reduced motion they go straight away.
  const find = (t: Thing) => {
    if (doing) return;
    setCaption(t.caption);
    const still = motionOff();
    if (!still) {
      setDoing(t.id);
      setTimeout(() => setDoing(null), t.exit ? 2000 : 1000);
    }
    if (t.exit) {
      setTimeout(() => (t.exit === 'home' ? router.push('/') : goBack()), still ? 0 : 950);
      return;
    }
    setFound((f) => (f.includes(t.id) ? f : [...f, t.id]));
  };

  const lit = found.length >= COUNTED;

  return (
    <div
      ref={roomRef}
      className={`dark-room${lit ? ' is-lit' : ''}${doing === 'door' ? ' is-door' : ''}`}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerMove}
    >
      <div className="dark-play">
        <p className="dark-count" aria-hidden="true">{found.length} / {COUNTED} found</p>
        <p className="dark-404" aria-hidden="true">404</p>
        <p className="dark-caption" role="status" aria-live="polite">
          {lit ? 'Lights on. The page is still missing, but look at all this stuff.' : caption}
        </p>
        {THINGS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-id={t.id}
            className={`dark-thing${found.includes(t.id) ? ' is-found' : ''}${t.exit ? ' is-exit' : ''}${doing === t.id ? ' is-doing' : ''}`}
            style={{ left: `${t.x}%`, top: `${t.y}%`, '--r': `${t.r}deg` } as React.CSSProperties}
            aria-label={`${t.label}${found.includes(t.id) ? ' (found)' : ''}`}
            onFocus={(e) => spot(e.currentTarget)}
            onClick={() => find(t)}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <span className="dark-shade" aria-hidden="true" />
      <span className="dark-flash" aria-hidden="true" />

      <section className="dark-panel">
        <h1 className="dark-title">Page not found</h1>
        <p className="dark-sub">
          <span className="dark-path">{pathname || 'This page'}</span> is not here. We looked everywhere, in the dark, with a
          flashlight, which is not the same as looking properly.
        </p>
        <nav className="dark-exits" aria-label="Pages that exist">
          {canGoBack && (
            <button type="button" className="rail-link tap-44" onClick={goBack}>Back</button>
          )}
          {LINKS_ROW.map((tab) =>
            'external' in tab && tab.external ? (
              <a key={tab.label} href={tab.href} target="_blank" rel="noopener noreferrer" className="rail-link tap-44">
                {tab.label}<span className="sr-only"> (opens in a new tab)</span> <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <Link key={tab.label} href={tab.href} className="rail-link tap-44">{tab.label}</Link>
            ),
          )}
        </nav>
      </section>
    </div>
  );
}
