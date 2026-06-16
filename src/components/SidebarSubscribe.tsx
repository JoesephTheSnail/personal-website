'use client';

import { useState } from 'react';
import { FaArrowRight } from 'react-icons/fa';

export default function SidebarSubscribe() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const url = `https://arnav01.substack.com/subscribe?email=${encodeURIComponent(email)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="px-3 pb-1">
      <p className="text-[0.7rem] font-semibold text-white/55 mb-2 tracking-wide text-center">
        Follow for Monthly Updates
      </p>
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          required
          className="flex-1 min-w-0 text-[0.72rem] px-2.5 py-1.5 rounded-md outline-none"
          style={{
            background: 'var(--hover-bg)',
            border: '1px solid var(--border-med)',
            color: 'var(--fg)',
          }}
        />
        <button
          type="submit"
          className="flex-shrink-0 p-1.5 rounded-md transition-opacity hover:opacity-70"
          style={{ background: 'var(--border-med)' }}
          aria-label="Subscribe"
        >
          <FaArrowRight size={11} style={{ color: 'var(--fg)' }} />
        </button>
      </form>
    </div>
  );
}
