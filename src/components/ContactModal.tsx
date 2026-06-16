'use client';

import { useEffect, useState } from 'react';
import { FaLinkedin, FaMedium, FaEnvelope, FaCalendarAlt, FaTimes } from 'react-icons/fa';
import { FaTiktok } from 'react-icons/fa6';
import { SiSubstack } from 'react-icons/si';

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

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        background: `rgba(0,0,0,${visible ? '0.75' : '0'})`,
        backdropFilter: `blur(${visible ? 4 : 0}px)`,
        WebkitBackdropFilter: `blur(${visible ? 4 : 0}px)`,
        transition: 'background 0.22s ease, backdrop-filter 0.18s ease, -webkit-backdrop-filter 0.18s ease',
      }}
      onClick={onClose}
    >
      <div
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
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
          aria-label="Close"
        >
          <FaTimes size={15} />
        </button>

        {/* Heading */}
        <h2 className="font-poppins font-semibold text-[#FFFFFF] text-2xl mb-6 tracking-tight">
          Get in touch
        </h2>

        {/* Email as text */}
        <div className="mb-6">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1.5">Email</p>
          <div className="flex items-center gap-2">
            <FaEnvelope size={13} className="text-white/30" />
            <a
              href="mailto:chandraarnav09@gmail.com"
              className="text-white text-sm hover:text-[#FFFFFF] transition-colors"
            >
              chandraarnav09@gmail.com
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />

        {/* Social icons — centered */}
        <p className="text-white/40 text-xs uppercase tracking-widest mb-4 text-center">
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
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:border-[#FFFFFF]/50 group-hover:bg-[#FFFFFF]/5"
                style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
              >
                <Icon size={18} className="text-white/70 group-hover:text-[#FFFFFF] transition-colors" />
              </div>
              <span className="text-[0.65rem] text-white/30 group-hover:text-[#FFFFFF] transition-colors">
                {label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
