'use client';

import { useEffect, useRef, useState } from 'react';
import { FaUniversalAccess } from 'react-icons/fa6';
import { useAccessibilityPrefs } from '@/lib/useAccessibilityPrefs';
import { playPop, playTick } from '@/lib/sound';

// A tiny, fixed icon in the corner — deliberately not a header button (that
// read as a heavier, more crowded control row) and not duplicated
// per-nav-variant. One instance, rendered
// once at the app-shell level, works identically on every page and every
// breakpoint.
export default function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const { reduceMotion, reduceTransparency, toggleMotion, toggleTransparency } = useAccessibilityPrefs();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus(); // keep keyboard users where they were
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    playPop(!open);
    setOpen((o) => !o);
  };

  return (
    <div ref={menuRef} className="a11y-corner">
      <button
        ref={triggerRef}
        onClick={toggle}
        aria-label="Accessibility options"
        aria-expanded={open}
        className="a11y-corner-btn"
      >
        <FaUniversalAccess size={13} />
      </button>

      {open && (
        <div className="a11y-menu a11y-menu--corner" role="group" aria-label="Accessibility options">
          <button
            aria-pressed={reduceMotion}
            onClick={() => { playTick(); toggleMotion(); }}
            className="a11y-menu__item"
          >
            <span>Reduce motion</span>
            <span className={`a11y-switch ${reduceMotion ? 'a11y-switch--on' : ''}`} aria-hidden="true" />
          </button>
          <button
            aria-pressed={reduceTransparency}
            onClick={() => { playTick(); toggleTransparency(); }}
            className="a11y-menu__item"
          >
            <span>Reduce transparency</span>
            <span className={`a11y-switch ${reduceTransparency ? 'a11y-switch--on' : ''}`} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
