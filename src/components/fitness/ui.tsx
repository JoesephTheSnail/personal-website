'use client';

import { useEffect, useState } from 'react';
import { FaCaretUp, FaCaretDown } from 'react-icons/fa';
import type { StatTrend, FxColor } from '@/lib/fitness/types';

// Shared UI primitives for the Fitness dashboard.
// Sharp corners, dense padding, monospace labels — deliberately distinct
// from the rest of the site's rounded/Poppins/indigo look.

const REEL_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

// One digit's vertical reel: a column of 0-9 sits behind a 1-line-tall
// mask, and a single CSS transform transition slides it from a random
// starting digit to the real one. A continuous eased transform reads as
// a genuine smooth roll — quite different from the earlier version,
// which re-picked a new random digit every animation frame (a discrete,
// flickery swap rather than one fluid motion).
function DigitReel({ digit, delayMs }: { digit: number; delayMs: number }) {
  // Deterministic starting offset, not Math.random() — OverviewSection is
  // server-rendered, so the initial value has to match between the server
  // render and the first client render or React flags a hydration mismatch
  // (a real one hit here: this component used to live behind a client-only
  // dynamic import, which masked it, until that ssr:false was narrowed to
  // just the pie chart).
  const [shown, setShown] = useState((digit + 6) % 10);

  useEffect(() => {
    const id = setTimeout(() => setShown(digit), delayMs);
    return () => clearTimeout(id);
  }, [digit, delayMs]);

  return (
    <span style={{ display: 'inline-block', height: '1em', lineHeight: 1, overflow: 'hidden', verticalAlign: 'top' }}>
      <span
        style={{
          display: 'block',
          transform: `translateY(${-shown * 10}%)`,
          transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {REEL_DIGITS.map((d) => (
          <span key={d} style={{ display: 'block', height: '1em', lineHeight: 1 }}>{d}</span>
        ))}
      </span>
    </span>
  );
}

// On mount, every digit character slides in from a random value to the
// real one via DigitReel; non-digit characters (letters, spaces,
// punctuation) render statically. Purely a mount-in effect — it doesn't
// track live value changes, since these stats only ever render once per
// page load.
export function Odometer({ value, className, style }: { value: string; className?: string; style?: React.CSSProperties }) {
  const chars = value.split('');
  const digitIndices = chars.reduce<number[]>((acc, c, i) => {
    if (/[0-9]/.test(c)) acc.push(i);
    return acc;
  }, []);
  const stepDelayMs = 90;

  return (
    <span className={className} style={{ ...style, display: 'inline-flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
      {chars.map((c, i) => {
        // A literal space as the sole content of a flex item collapses to
        // zero width inside display:inline-flex — swap in a non-breaking
        // space so "58 ms" doesn't render as "58ms".
        if (!/[0-9]/.test(c)) return <span key={i}>{c === ' ' ? ' ' : c}</span>;
        const order = digitIndices.indexOf(i);
        // Rightmost digit settles first, like a real odometer reel.
        const indexFromRight = digitIndices.length - 1 - order;
        return <DigitReel key={i} digit={Number(c)} delayMs={indexFromRight * stepDelayMs} />;
      })}
    </span>
  );
}

export function Panel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`fx-panel p-4 ${className}`}>{children}</div>;
}

export function SectionHeader({
  icon: Icon,
  title,
  right,
}: {
  icon?: React.ElementType;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={12} style={{ color: 'var(--fx-accent)' }} />}
        <h2 className="fx-label" style={{ color: 'var(--fx-fg-dim)' }}>
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

// Subtle tint per category — a soft background + border wash, not a
// bold-colored number. Keeps the value text legible/neutral while still
// giving each card a quiet visual identity (the "in-between" of fully
// rainbow and fully flat). Typed as `Record<FxColor, ...>` (not
// `Record<string, ...>`) so adding a color to FxColor without adding it
// here is a compile error, not a runtime `undefined.bg` crash. Exported
// so OverviewSection can reuse the same table instead of keeping its own
// copy in sync by hand.
export const TINT: Record<FxColor, { bg: string; border: string; icon: string }> = {
  default: { bg: 'var(--fx-panel)', border: 'var(--fx-border)', icon: 'var(--fx-fg-dimmer)' },
  blue: { bg: 'var(--fx-blue-soft)', border: 'var(--fx-blue-border)', icon: 'var(--fx-blue)' },
  green: { bg: 'var(--fx-green-soft)', border: 'var(--fx-green-border)', icon: 'var(--fx-green)' },
  accent: { bg: 'var(--fx-accent-soft)', border: 'var(--fx-accent-border)', icon: 'var(--fx-accent-bright)' },
  purple: { bg: 'var(--fx-purple-soft)', border: 'var(--fx-purple-border)', icon: 'var(--fx-purple)' },
  cyan: { bg: 'var(--fx-cyan-soft)', border: 'var(--fx-cyan-border)', icon: 'var(--fx-cyan)' },
};

function TrendBadge({ trend }: { trend: StatTrend }) {
  if (trend.direction === 'flat') {
    return <span className="text-[0.7rem]" style={{ color: 'var(--fx-fg-dimmer)' }}>Flat</span>;
  }
  const up = trend.direction === 'up';
  const Icon = up ? FaCaretUp : FaCaretDown;
  const color = up ? 'var(--fx-green)' : 'var(--fx-red)';
  return (
    <span className="inline-flex items-center gap-0.5 text-[0.7rem] font-medium" style={{ color }}>
      <Icon size={11} aria-hidden="true" />
      {trend.pct}%
    </span>
  );
}

export function StatCard({
  label,
  value,
  sublabel,
  color = 'default',
  trend,
}: {
  label: string;
  value: string;
  sublabel?: string;
  color?: FxColor;
  trend?: StatTrend;
}) {
  const tint = TINT[color];
  return (
    <div className="fx-panel p-3.5" style={{ background: tint.bg, borderColor: tint.border }}>
      <p className="fx-label mb-2">{label}</p>
      <p className="fx-value text-2xl">
        <Odometer value={value} style={{ color: 'var(--fx-fg)' }} />
      </p>
      <div className="flex items-center gap-2 mt-0.5">
        {sublabel && (
          <p className="text-[0.7rem]" style={{ color: 'var(--fx-fg-dimmer)' }}>
            {sublabel}
          </p>
        )}
        {trend && <TrendBadge trend={trend} />}
      </div>
    </div>
  );
}

export function Pill({
  text,
  tone = 'default',
}: {
  text: string;
  tone?: 'default' | 'accent' | 'green' | 'red' | 'blue';
}) {
  const toneStyles: Record<string, { bg: string; border: string; color: string }> = {
    default: { bg: 'var(--fx-panel-hover)', border: 'var(--fx-border-strong)', color: 'var(--fx-fg-dim)' },
    accent: { bg: 'var(--fx-accent-soft)', border: 'var(--fx-accent-border)', color: 'var(--fx-accent-bright)' },
    green: { bg: 'var(--fx-green-soft)', border: 'var(--fx-green-border)', color: 'var(--fx-green)' },
    red: { bg: 'var(--fx-red-soft)', border: 'var(--fx-red-border)', color: 'var(--fx-red)' },
    blue: { bg: 'var(--fx-blue-soft)', border: 'var(--fx-blue-border)', color: 'var(--fx-blue)' },
  };
  const s = toneStyles[tone];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[0.72rem] font-medium rounded"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      {text}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  color = 'var(--fx-accent)',
  track = 'var(--fx-track)',
}: {
  value: number;
  max: number;
  color?: string;
  track?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: track }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ── Section tab switcher ────────────────────────────────

export interface FitnessTab {
  key: string;
  label: string;
  icon: React.ElementType;
}

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: FitnessTab[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto fx-scroll pb-1">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            aria-pressed={isActive}
            className="fx-tab flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap flex-shrink-0"
            style={{
              background: isActive ? 'var(--fx-accent-soft)' : 'transparent',
              border: `1px solid ${isActive ? 'var(--fx-accent-border)' : 'var(--fx-border)'}`,
              color: isActive ? 'var(--fx-accent-bright)' : 'var(--fx-fg-dim)',
            }}
          >
            <t.icon size={11} aria-hidden="true" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
