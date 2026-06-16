'use client';

import { CSSProperties } from 'react';

export default function ContactTrigger({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('open-contact'))}
      className={className}
      style={style}
    >
      {children}
    </button>
  );
}
