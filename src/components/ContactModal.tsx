'use client';

import { useEffect, useRef, useState } from 'react';
import { playPop } from '@/lib/sound';
import { LINKS } from '@/lib/links';

const EMAIL = LINKS.email;

// Easter egg: copy the email again and again and a quiet line starts keeping count, like a game announcer
// with good manners. The first copy is plain. The streak resets after a short pause or when the card closes.
// From the tenth copy the card's edge turns blue and the row shakes.
const STREAK_LINES = [
  'Double copy',
  'Triple copy',
  'Dominating',
  'Rampage',
  'Mega copy',
  'Unstoppable',
  'Wicked sick',
  'Monster copy',
  'Godlike',
  'Beyond godlike',
  'Your clipboard has filed a complaint',
  'It is the same email. It has always been the same email.',
  'Okay, you clearly like it. Now send one.',
];
const STREAK_RESET_MS = 3000;
const GODLIKE_AT = 10;

const links = [
  { label: 'Book a call', note: 'Calendly',  href: LINKS.calendly },
  { label: 'LinkedIn',    note: 'Profile',   href: LINKS.linkedin },
  { label: 'Substack',    note: 'Newsletter', href: LINKS.substack },
  { label: 'Medium',      note: 'Writing',   href: LINKS.medium },
];

interface Props { isOpen: boolean; onClose: () => void; }

export default function ContactModal({ isOpen, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [tick, setTick] = useState(0); // changes on every copy so the callout replays its pop
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      playPop(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Focus management: move focus into the dialog on open, trap Tab inside
  // it while open, and hand focus back to whatever opened it on close —
  // without this, keyboard focus stays on (or drifts behind) the trigger,
  // and Tab can walk straight out into the dimmed page underneath.
  // Safari does not focus a button when it is clicked, so document.activeElement
  // is <body> at open time there. Remember what was last pressed instead.
  const lastPressedRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      lastPressedRef.current = (e.target as HTMLElement | null)?.closest<HTMLElement>('button, a, [role="button"]') ?? null;
    };
    // A key press means the dialog was opened from the keyboard, where
    // document.activeElement is already the right button.
    const onKey = () => { lastPressedRef.current = null; };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, []);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      // Safari focuses the nearest focusable ancestor (here <main>) when a
      // button is clicked, so a pressed button wins over activeElement.
      const pressed = lastPressedRef.current;
      const active = document.activeElement as HTMLElement | null;
      triggerRef.current = pressed && pressed.isConnected ? pressed : active && active !== document.body ? active : null;
    } else if (wasOpenRef.current) {
      // Only on a real close. On first render the dialog has never been open,
      // and moving focus then would put a ring on the menu button at page load.
      wasOpenRef.current = false;
      const trigger = triggerRef.current;
      // The mobile menu's "Get in touch" button is gone by now, so hand focus
      // to the menu button instead of dropping it on <body>.
      if (trigger && trigger.isConnected) trigger.focus();
      else document.querySelector<HTMLElement>('button[aria-controls="mobile-menu-panel"]')?.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  // Focus moves in only once the panel exists. It is rendered a commit after
  // `isOpen` flips, so focusing from the effect above found no panel on
  // Chromium and left focus on the trigger behind the dialog.
  useEffect(() => {
    if (isOpen && mounted) {
      panelRef.current?.querySelector<HTMLElement>('[data-modal-initial-focus]')?.focus();
    }
  }, [isOpen, mounted]);

  // Everything behind the dialog is made inert while it is open: Tab, screen
  // reader browsing and clicks cannot reach the page underneath. The Tab
  // wrap below then only has to handle the dialog's own first and last stops.
  useEffect(() => {
    if (!isOpen || !mounted) return;
    const inerted: Element[] = [];
    for (const el of Array.from(document.body.children)) {
      if (el.hasAttribute('data-contact-modal') || el.tagName === 'SCRIPT' || el.hasAttribute('inert')) continue;
      el.setAttribute('inert', '');
      inerted.push(el);
    }
    return () => inerted.forEach((el) => el.removeAttribute('inert'));
  }, [isOpen, mounted]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleClose = () => {
    playPop(false);
    onClose();
  };

  useEffect(() => {
    // Only while open: without this guard every Escape press anywhere on the
    // site played the close sound and called onClose.
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    // Locking scroll removes the scrollbar, which widens body's content
    // box by the scrollbar's own width and shifts everything behind the
    // blur over by a few pixels. Reserving that width back as padding is
    // what keeps the page from visibly shifting when the modal opens.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  // The streak does not survive closing the card, and the timer must not outlive the component.
  useEffect(() => {
    if (!isOpen) setStreak(0);
  }, [isOpen]);
  // Replays the shake on every copy from GODLIKE up, without remounting the button (that would drop keyboard focus).
  useEffect(() => {
    const row = rowRef.current;
    if (!row || streak < GODLIKE_AT) return;
    row.classList.remove('copy-shake');
    void row.offsetWidth;
    row.classList.add('copy-shake');
  }, [tick, streak]);
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  if (!mounted) return null;

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setStreak((n) => n + 1);
      setTick((t) => t + 1);
      playPop(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setStreak(0), STREAK_RESET_MS);
    } catch { /* clipboard blocked: the mailto link still works */ }
  };

  const godlike = streak >= GODLIKE_AT;
  // Nothing extra on the first copy; the line starts with the second.
  const line = streak > 1 ? STREAK_LINES[Math.min(streak - 2, STREAK_LINES.length - 1)] : '';

  return (
    <div
      data-contact-modal
      className="contact-modal-overlay fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        // The blur stays at a constant 6px and only opacity animates:
        // changing a backdrop-filter radius every frame repaints the whole
        // viewport (slowest in Safari and on phones), opacity does not.
        background: 'rgba(10,10,9,0.82)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.22s var(--ease-out)',
      }}
      onClick={handleClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-heading"
        className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto p-7 sm:p-12"
        style={{
          background: 'var(--bg)',
          border: `1px solid ${godlike ? 'var(--accent)' : 'var(--border-med)'}`,
          boxShadow: godlike ? '0 0 0 1px rgba(91, 163, 194, 0.3), 0 0 44px rgba(91, 163, 194, 0.16)' : 'none',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(14px)',
          transition: 'opacity 0.25s ease, transform 0.3s var(--ease-out), border-color 0.3s ease, box-shadow 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-eyebrow)' }}>
            Get in touch
          </p>
          <button
            type="button"
            onClick={handleClose}
            data-modal-initial-focus
            className="tap-44 rail-link text-[10.5px] uppercase tracking-[0.14em]"
            style={{ color: 'var(--fg-60)' }}
          >
            Close
          </button>
        </div>

        <h2
          id="contact-modal-heading"
          className="mt-6 text-[clamp(2.25rem,6vw,3.25rem)] font-medium leading-[0.98] tracking-[-0.04em]"
          style={{ color: 'var(--fg)' }}
        >
          Let&apos;s talk.
        </h2>
        <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed" style={{ color: 'var(--fg-70)' }}>
          Health, technology, ideas, or a project you think I&apos;d like. Email is best.
        </p>

        {/* The email is the primary action, so it's the biggest thing here. */}
        <div ref={rowRef} className="mt-9">
          <a
            href={`mailto:${EMAIL}`}
            className="tap-44 proud-link inline-block pb-1 text-[clamp(1.1rem,3.4vw,1.5rem)] tracking-[-0.02em] [overflow-wrap:anywhere]"
            style={{ color: 'var(--fg)' }}
          >
            {EMAIL}
          </a>
          <button
            type="button"
            onClick={copyEmail}
            className="tap-44 rail-link ml-5 text-[10.5px] uppercase tracking-[0.14em]"
            style={{ color: streak > 0 ? 'var(--accent)' : 'var(--fg-60)' }}
          >
            {streak === 0 ? 'Copy' : streak === 1 ? 'Copied' : `Copied ×${streak}`}
          </button>
          {/* The announcer. Always in the layout so the card does not jump. */}
          {/* The live region itself stays mounted (screen readers only announce changes to a region that
              already exists); the key on the inner span replays the pop on every copy. */}
          <p
            role="status"
            aria-live="polite"
            className="copy-callout"
            style={{ color: godlike ? 'var(--accent)' : 'var(--fg-70)' }}
          >
            <span key={tick} className={line ? 'copy-callout-text is-on' : undefined} style={{ display: 'inline-block' }}>
              {line}
            </span>
          </p>
        </div>

        <ul className="mt-10 border-t" style={{ borderColor: 'var(--border-med)' }}>
          {links.map(({ label, note, href }) => (
            <li key={label} style={{ borderBottom: '1px solid var(--border-med)' }}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="index-row flex items-baseline gap-4 py-3.5"
              >
                <span className="index-label text-[1.25rem] tracking-[-0.02em]" style={{ color: 'var(--fg)' }}>
                  {label}
                </span>
                <span className="index-leader min-w-6 flex-1 -translate-y-[0.3rem]" aria-hidden="true" />
                <span className="text-[10.5px] uppercase tracking-[0.14em]" style={{ color: 'var(--fg-60)' }}>
                  {note} <span aria-hidden="true">↗</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
