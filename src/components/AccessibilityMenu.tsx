'use client';

import { useEffect, useRef, useState } from 'react';
import { FaUniversalAccess } from 'react-icons/fa6';
import { useAccessibilityPrefs } from '@/lib/useAccessibilityPrefs';
import { playPop, playTick } from '@/lib/sound';

// A tiny, fixed icon in the corner — deliberately not a second header
// button next to the theme toggle (that read as a heavier, more crowded
// control row) and not duplicated per-nav-variant. One instance, rendered
// once at the app-shell level, works identically on every page and every
// breakpoint.
export default function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const { reduceMotion, reduceTransparency, toggleMotion, toggleTransparency } = useAccessibilityPrefs();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
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
        onClick={toggle}
        aria-label="Accessibility options"
        aria-expanded={open}
        aria-haspopup="menu"
        className="a11y-corner-btn"
      >
        <FaUniversalAccess size={13} />
      </button>

      {open && (
        <div className="a11y-menu a11y-menu--corner" role="menu">
          <button
            role="menuitemcheckbox"
            aria-checked={reduceMotion}
            onClick={() => { playTick(); toggleMotion(); }}
            className="a11y-menu__item"
          >
            <span>Reduce motion</span>
            <span className={`a11y-switch ${reduceMotion ? 'a11y-switch--on' : ''}`} aria-hidden="true" />
          </button>
          <button
            role="menuitemcheckbox"
            aria-checked={reduceTransparency}
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
