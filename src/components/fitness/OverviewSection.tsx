'use client';

import dynamic from 'next/dynamic';
import { FaRunning, FaBicycle, FaSwimmer, FaDumbbell, FaWalking, FaSyncAlt, FaWaveSquare, FaHeartbeat, FaLungs, FaBed } from 'react-icons/fa';
import type { OverviewData, TypeBreakdown, RecoveryMetric, FxColor } from '@/lib/fitness/types';
import { Panel, SectionHeader, StatCard, Odometer, TINT } from './ui';

// Only the pie chart itself needs to skip SSR (recharts' ResponsiveContainer
// measures differently server vs. client and assigns clip-path ids from a
// module counter that can drift across that boundary) — everything else in
// this file is plain DOM and renders on the server like normal. Scoping
// ssr:false to just this one chart means a page refresh never blanks the
// whole Overview tab; only this fixed-size chart shows its placeholder
// briefly instead.
//
// webpackPrefetch tells the browser to fetch this chunk at idle priority
// as soon as the page's HTML is parsed, in parallel with hydration,
// instead of only starting the fetch once React actually reaches this
// component — that's what was causing the visible late pop-in.
const TimeBySportChart = dynamic(() => import(/* webpackPrefetch: true */ './TimeBySportChart'), {
  ssr: false,
  loading: () => <div className="fx-panel" style={{ width: 168, height: 168, flexShrink: 0, background: 'var(--fx-panel-hover)' }} />,
});

const SPORT_ICON: Record<string, React.ElementType> = {
  Run: FaRunning, Ride: FaBicycle, Swim: FaSwimmer, Strength: FaDumbbell, Walk: FaWalking, 'Cross-train': FaSyncAlt,
};

const RECOVERY_ICON: Record<RecoveryMetric['key'], React.ElementType> = {
  hrv: FaWaveSquare, rhr: FaHeartbeat, vo2max: FaLungs, sleepScore: FaBed,
};

// Recovery notes carry real judgment ("above average" vs. a decline), so
// unlike the card's background tint, this color is semantic rather than
// decorative — green/red only apply when the note actually says something
// is good or bad.
const NOTE_SENTIMENT_COLOR: Record<NonNullable<RecoveryMetric['noteSentiment']>, string> = {
  positive: 'var(--fx-green)',
  negative: 'var(--fx-red)',
  neutral: 'var(--fx-fg-dimmer)',
};

// TypeBreakdown items (Session Mix, Mileage) carry a raw CSS-var string
// in `.color` — this just names which semantic FxColor that var
// corresponds to, so the actual bg/icon values live in one place (ui.tsx's
// TINT) instead of being duplicated here. 'var(--fx-red)' has no FxColor
// counterpart — red is reserved for "negative trend" — so it isn't
// mapped; unmapped/unknown values fall back to 'default' via `?? 'default'`
// below rather than crashing.
const CSS_VAR_TO_COLOR: Record<string, FxColor> = {
  'var(--fx-accent-bright)': 'accent',
  'var(--fx-blue)': 'blue',
  'var(--fx-purple)': 'purple',
  'var(--fx-green)': 'green',
  'var(--fx-cyan)': 'cyan',
};

function softTintFor(cssVar: string) {
  return TINT[CSS_VAR_TO_COLOR[cssVar] ?? 'default'];
}

interface Props {
  data: OverviewData;
}

export default function OverviewSection({ data }: Props) {
  const { quickStats, timeByType, mileageBySport, mileageFunFact, recoveryMetrics } = data;
  const timeByTypeTotal = timeByType.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-4">
      {/* Headline stats — This Week broken out by sport, plus This Month overall */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickStats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} sublabel={s.sublabel} color={s.color} trend={s.trend} />
        ))}
      </div>

      {/* Recovery — autonomic/readiness signals, not workout output */}
      <Panel>
        <SectionHeader title="Recovery" right={<span className="text-[0.72rem]" style={{ color: 'var(--fx-fg-dimmer)' }}>today</span>} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {recoveryMetrics.map((m) => {
            const Icon = RECOVERY_ICON[m.key];
            const tint = TINT[m.color];
            return (
              <div key={m.key} className="fx-panel p-3" style={{ background: tint.bg, borderColor: tint.bg }}>
                <div className="flex items-start gap-1.5 mb-2 min-h-[2em]">
                  <Icon size={11} aria-hidden="true" className="mt-0.5 flex-shrink-0" style={{ color: tint.icon }} />
                  <span className="text-[0.7rem] leading-tight" style={{ color: 'var(--fx-fg-dim)' }}>{m.label}</span>
                </div>
                <p className="fx-value text-lg"><Odometer value={m.value} style={{ color: 'var(--fx-fg)' }} /></p>
                {(m.noteStat || m.note) && (
                  <p className="text-[0.65rem] mt-0.5">
                    {m.noteStat && (
                      <span style={{ color: NOTE_SENTIMENT_COLOR[m.noteSentiment ?? 'neutral'] }}>{m.noteStat}</span>
                    )}
                    {m.note && <span style={{ color: 'var(--fx-fg-dimmer)' }}>{m.note}</span>}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Mileage by sport (replaces the old Session Mix panel — distance
          matters more here than raw session counts) + time-by-sport donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel>
          <SectionHeader title="Mileage by Sport" right={<span className="text-[0.72rem]" style={{ color: 'var(--fx-fg-dimmer)' }}>km, year to date</span>} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {mileageBySport.map((d) => {
              const Icon = SPORT_ICON[d.label] ?? FaSyncAlt;
              const tint = softTintFor(d.color);
              return (
                <div key={d.label} className="fx-panel p-3" style={{ background: tint.bg, borderColor: tint.bg }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon size={11} aria-hidden="true" style={{ color: tint.icon }} />
                    <span className="text-[0.7rem]" style={{ color: 'var(--fx-fg-dim)' }}>{d.label}</span>
                  </div>
                  <p className="fx-value text-lg">
                    <Odometer value={String(d.value)} style={{ color: 'var(--fx-fg)' }} /> km
                  </p>
                </div>
              );
            })}
          </div>
          {mileageFunFact && (
            <p className="text-[0.7rem] mt-3 pt-3" style={{ color: 'var(--fx-fg-dimmer)', borderTop: '1px solid var(--fx-border)' }}>
              {mileageFunFact}
            </p>
          )}
        </Panel>

        <Panel className="h-full flex flex-col">
          <SectionHeader title="Time by Sport" right={<span className="text-[0.72rem]" style={{ color: 'var(--fx-fg-dimmer)' }}>% of time, year to date</span>} />
          <div className="flex items-center gap-6 flex-1">
            <TimeBySportChart data={timeByType} />
            <TimeByTypeLegend items={timeByType} total={timeByTypeTotal} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function TimeByTypeLegend({ items, total }: { items: TypeBreakdown[]; total: number }) {
  return (
    <div className="flex flex-col gap-2.5 min-w-0 flex-1">
      {items.map((d) => {
        // total is 0 when there's no time-by-sport data yet (e.g. a
        // freshly-connected Strava account with no activities in range)
        // — show 0% rather than dividing by zero into "NaN%".
        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
        return (
          <div key={d.label} className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span style={{ color: 'var(--fx-fg-dim)' }}>{d.label}</span>
            <span className="fx-value ml-auto" style={{ color: 'var(--fx-fg)' }}>
              <Odometer value={String(pct)} />%
            </span>
          </div>
        );
      })}
    </div>
  );
}
