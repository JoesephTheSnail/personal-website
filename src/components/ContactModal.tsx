'use client';

import { useEffect, useRef, useState } from 'react';
import { FaLinkedin, FaMedium, FaEnvelope, FaCalendarAlt, FaTimes } from 'react-icons/fa';
import { FaTiktok } from 'react-icons/fa6';
import { SiSubstack } from 'react-icons/si';
import { playPop } from '@/lib/sound';

const links = [
  { label: 'LinkedIn',  href: 'https://www.linkedin.com/in/arnav-chandra-b33660293/', icon: FaLinkedin  },
  { label: 'Substack',  href: 'https://arnav01.substack.com/',                         icon: SiSubstack  },
  { label: 'Medium',    href: 'https://medium.com/@arnav0',                             icon: FaMedium    },
  { label: 'TikTok',   href: 'https://www.tiktok.com/@arnav.gym',                      icon: FaTiktok    },
  { label: 'Calendly', href: 'https://calendly.com/arnav01/meeting',                   icon: FaCalendarAlt },
];

interface Props { isOpen: boolean; onClose: () => void; }

export default function ContactModal({ isOpen, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
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
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => {
        panelRef.current?.querySelector<HTMLElement>('[data-modal-initial-focus]')?.focus();
      });
    } else {
      triggerRef.current?.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

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
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

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

  if (!mounted) return null;

  return (
    <div
      className="contact-modal-overlay fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        background: `rgba(0,0,0,${visible ? '0.75' : '0'})`,
        backdropFilter: `blur(${visible ? 4 : 0}px)`,
        WebkitBackdropFilter: `blur(${visible ? 4 : 0}px)`,
        transition: 'background 0.22s ease, backdrop-filter 0.18s ease, -webkit-backdrop-filter 0.18s ease',
      }}
      onClick={handleClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-heading"
        className="relative w-full max-w-sm rounded-2xl p-8"
        style={{
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.1)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          data-modal-initial-focus
          className="absolute top-4 right-4 hover:text-white transition-colors"
          style={{ color: 'rgba(255,255,255,0.3)' }}
          aria-label="Close"
        >
          <FaTimes size={15} />
        </button>

        {/* Heading */}
        <h2 id="contact-modal-heading" className="font-poppins font-semibold text-2xl mb-6 tracking-tight" style={{ color: '#ffffff' }}>
          Get in touch
        </h2>

        {/* Email as text — this card is always dark regardless of site
            theme, so colors are inline rather than Tailwind's text-white
            utilities: a sitewide `html.light .text-white` rule flips those
            to near-black for the rest of the site's light mode, which
            turned this text invisible against the still-dark #141414 card. */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Email</p>
          <div className="flex items-center gap-2">
            <FaEnvelope size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <a
              href="mailto:chandraarnav09@gmail.com"
              className="text-sm hover:text-white transition-colors"
              style={{ color: '#ffffff' }}
            >
              chandraarnav09@gmail.com
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />

        {/* Social icons — centered */}
        <p className="text-xs uppercase tracking-widest mb-4 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Find me on
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          {links.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="group flex flex-col items-center gap-1.5"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:border-white/50 group-hover:bg-white/5"
                style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
              >
                <Icon size={18} className="group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.7)' }} />
              </div>
              <span className="text-[0.65rem] group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
