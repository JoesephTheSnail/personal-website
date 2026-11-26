'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBars, FaTimes } from 'react-icons/fa';
import { playPop, playTick } from '@/lib/sound';
import { useAccessibilityPrefs } from '@/lib/useAccessibilityPrefs';
import { NAV_ITEMS, isNavActive } from '@/lib/navItems';

interface Props { onContactClick: () => void; }

type MenuState = 'closed' | 'open' | 'closing';

export default function MobileNav({ onContactClick }: Props) {
  const [menuState, setMenuState] = useState<MenuState>('closed');
  const [openKey, setOpenKey]     = useState(0);
  const [mounted, setMounted]     = useState(false);
  const pathname   = usePathname();
  const { reduceMotion, reduceTransparency, toggleMotion, toggleTransparency } = useAccessibilityPrefs();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const close = () => {
    setMenuState(current => {
      if (current === 'closed') return 'closed';
      playPop(false);
      closeTimer.current = setTimeout(() => setMenuState('closed'), 180);
      return 'closing';
    });
  };

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenKey(k => k + 1); // force fresh mount so animation always restarts cleanly
    setMenuState('open');
    playPop(true);
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
      const target = e.target as Element | null;
      // The menu button closes the menu itself on click. Closing on its mousedown
      // too left the click to see a "closing" menu and reopen it.
      if (target?.closest?.('button[aria-controls="mobile-menu-panel"]')) return;
      if (menu && !menu.contains(target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        document.querySelector<HTMLElement>('button[aria-controls="mobile-menu-panel"]')?.focus();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuState]);

  const open    = menuState === 'open';
  const visible = menuState !== 'closed';

  // Close uses ease-out like open: an ease-in exit starts slowly, which is the
  // exact moment the visitor is watching. Items arrive on a 25ms stagger.
  const animStyle = open
    ? { animation: 'sheet-in 0.26s var(--ease-out) forwards' }
    : { animation: 'sheet-out 0.16s var(--ease-out) forwards' };

  // A flat sheet that drops from under the bar: same plain type as the
  // desktop sidebar, no card, no icons.
  const panel = visible ? (
    <div
      key={openKey}
      id="mobile-menu-panel"
      data-state={open ? 'open' : 'closing'}
      style={{
        position:   'fixed',
        top:        '3.5rem',
        left:       0,
        right:      0,
        zIndex:     50,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border-med)',
        padding:    '12px 20px 24px',
        // A phone held sideways is ~390px tall: without a cap the sheet runs
        // off the bottom and its last link cannot be reached.
        maxHeight:  'calc(100dvh - 3.5rem)',
        overflowY:  'auto',
        overscrollBehavior: 'contain',
        ...animStyle,
      }}
    >
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
                onClick={() => close()}
                className="flex items-baseline gap-4 py-2.5 text-[1.75rem] tracking-[-0.03em]"
                style={{
                  color:     active ? 'var(--accent)' : 'var(--fg)',
                  // items start transparent and fade in; during close they stay visible (panel handles exit)
                  opacity:   open ? 0 : 1,
                  animation: open ? `item-in 0.22s var(--ease-out) forwards ${40 + i * 25}ms` : 'none',
                }}
              >
                <span className="w-6 text-[11px] tabular-nums" style={{ color: active ? 'var(--accent)' : 'var(--fg-45)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {item.label}
                {item.external && <span aria-hidden="true" className="text-[0.6em]">↗</span>}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t pt-5" style={{ borderColor: 'var(--border-med)' }}>
        <button
          type="button"
          onClick={() => { close(); onContactClick(); }}
          className="tap-44 proud-link pb-1 text-[1rem]"
          style={{
            color:     'var(--fg)',
            opacity:   open ? 0 : 1,
            animation: open ? `item-in 0.22s var(--ease-out) forwards ${40 + NAV_ITEMS.length * 25}ms` : 'none',
          }}
        >
          Get in touch <span aria-hidden="true">→</span>
        </button>
      </div>

      {/* Below 1024px the floating accessibility button is hidden (it sat on
          top of the text), so the same two settings live here. */}
      <div
        role="group"
        aria-label="Accessibility options"
        className="mt-5 border-t pt-5"
        style={{
          borderColor: 'var(--border-med)',
          opacity:   open ? 0 : 1,
          animation: open ? `item-in 0.22s var(--ease-out) forwards ${40 + (NAV_ITEMS.length + 1) * 25}ms` : 'none',
        }}
      >
        <p className="text-[10.5px] uppercase tracking-[0.14em]" style={{ color: 'var(--fg-60)' }}>
          Accessibility
        </p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {[
            { label: 'Reduce motion', on: reduceMotion, toggle: toggleMotion },
            { label: 'Reduce transparency', on: reduceTransparency, toggle: toggleTransparency },
          ].map(({ label, on, toggle }) => (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() => { playTick(); toggle(); }}
              className={`tap-44 ledger-filter pb-1 text-[0.9375rem] ${on ? 'proud-link' : ''}`}
              style={{ color: on ? 'var(--fg)' : 'var(--fg-60)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* p-[13px] brings the tap target up to the 44x44px minimum (Apple
          HIG / WCAG 2.5.5) around an 18px icon — the visible icon was
          previously sitting in only a 26x26px hit area, easy to miss with
          a thumb even though it's trivial to hit with a mouse pointer. The
          matching -m-[9px] pulls the extra padding back out of the flex
          row's layout — only the invisible hit area grows, not anything visual. */}
      <button
        onClick={() => {
          if (menuState === 'open') close();
          else openMenu();
        }}
        className="menu-toggle p-[13px] -m-[9px] transition-[transform,color] duration-200"
        style={{
          color:     'var(--fg-50)',
          transform: open ? 'rotate(90deg) scale(0.9)' : 'rotate(0deg) scale(1)',
        }}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
      >
        {/* Both icons stay mounted and crossfade; swapping them outright popped
            in the middle of the button's quarter turn. */}
        <span className="relative block h-[18px] w-[18px]" aria-hidden="true">
          <FaBars size={18} className="absolute inset-0 transition-opacity duration-150" style={{ opacity: open ? 0 : 1 }} />
          <FaTimes size={16} className="absolute left-px top-px transition-opacity duration-150" style={{ opacity: open ? 1 : 0 }} />
        </span>
      </button>

      {mounted && createPortal(panel, document.body)}
    </>
  );
}
