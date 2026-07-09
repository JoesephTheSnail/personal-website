'use client';

import { FaRunning, FaDumbbell, FaBed, FaSyncAlt, FaBicycle, FaSwimmer, FaCalendarAlt, FaCheckCircle } from 'react-icons/fa';
import type { PlanData, PlanWorkout } from '@/lib/fitness/types';
import { Panel, SectionHeader, Pill, ProgressBar } from './ui';

// Subtle per-sport icon tint (same palette used on Overview: run=accent,
// ride=blue, swim=purple, strength=red) — just the small icon badge, not
// the card itself, so it reads as a quiet hint rather than decoration.
// Colors that actually mean something (done = green, today = accent
// border, intensity = semantic pill) stay untouched and take priority.
const TYPE_META: Record<PlanWorkout['type'], { icon: React.ElementType; color: string; bg: string }> = {
  run:          { icon: FaRunning,  color: 'var(--fx-accent-bright)', bg: 'var(--fx-accent-soft)' },
  ride:         { icon: FaBicycle,  color: 'var(--fx-blue)',          bg: 'var(--fx-blue-soft)' },
  swim:         { icon: FaSwimmer,  color: 'var(--fx-cyan)',          bg: 'var(--fx-cyan-soft)' },
  strength:     { icon: FaDumbbell, color: 'var(--fx-purple)',        bg: 'var(--fx-purple-soft)' },
  rest:         { icon: FaBed,      color: 'var(--fx-fg-dim)',        bg: 'var(--fx-panel-hover)' },
  'cross-train':{ icon: FaSyncAlt,  color: 'var(--fx-slate)',         bg: 'var(--fx-slate-soft)' },
};

const INTENSITY_TONE: Record<string, 'default' | 'accent' | 'green' | 'red' | 'blue'> = {
  easy: 'green',
  moderate: 'blue',
  hard: 'red',
  rest: 'default',
};

function formatEventTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return { date, time };
}

export default function PlanSection({ data }: { data: PlanData }) {
  const { week, upcoming } = data;

  // Weekly completion — planned workouts only (rest days don't count either way)
  const planned = week.flatMap((d) => d.workouts).filter((w) => w.type !== 'rest');
  const done = planned.filter((w) => w.completed).length;

  return (
    <div className="space-y-4">
      <Panel>
        <SectionHeader
          title="This Week's Plan"
          right={
            <span className="text-[0.72rem]" style={{ color: done === planned.length && planned.length > 0 ? 'var(--fx-green)' : 'var(--fx-fg-dim)' }}>
              {done} / {planned.length} completed
            </span>
          }
        />
        <div className="mb-4">
          <ProgressBar value={done} max={Math.max(planned.length, 1)} color="var(--fx-green)" />
        </div>
        <div className="flex items-stretch gap-2.5 overflow-x-auto fx-scroll pb-2">
          {week.map((day) => (
            <div
              key={day.date}
              className="fx-panel p-3 flex flex-col gap-2 flex-1"
              style={{ minWidth: 200, ...(day.isToday ? { borderColor: 'var(--fx-accent-border)', background: 'var(--fx-accent-soft)' } : undefined) }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="fx-label" style={{ color: day.isToday ? 'var(--fx-accent-bright)' : 'var(--fx-fg-dimmer)' }}>
                  {day.dayLabel}
                </span>
                {day.isToday && <Pill text="TODAY" tone="accent" />}
              </div>
              <p className="text-[0.72rem] mb-1" style={{ color: 'var(--fx-fg-dimmer)' }}>{day.dateLabel}</p>

              {day.workouts.length === 0 ? (
                <p className="text-[0.7rem]" style={{ color: 'var(--fx-fg-dimmer)' }}>Rest</p>
              ) : (
                day.workouts.map((w) => {
                  const meta = TYPE_META[w.type];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={w.id}
                      className="fx-panel p-2.5"
                      style={w.completed
                        ? { background: 'var(--fx-green-soft)', borderColor: 'var(--fx-green-border)' }
                        : { background: 'var(--fx-panel-hover)' }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: w.completed ? 'var(--fx-green-soft)' : meta.bg }}>
                          {w.completed ? <FaCheckCircle size={10} aria-label="Completed" style={{ color: 'var(--fx-green)' }} /> : <Icon size={9} aria-hidden="true" style={{ color: meta.color }} />}
                        </div>
                        <span className="text-[0.7rem] font-medium leading-tight" style={{ color: w.completed ? 'var(--fx-green)' : 'var(--fx-fg)' }}>{w.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Pill text={`${w.durationMin}m`} />
                        {w.completed ? <Pill text="done" tone="green" /> : <Pill text={w.intensity} tone={INTENSITY_TONE[w.intensity]} />}
                      </div>
                      {w.note && <p className="text-[0.72rem] mt-1.5 leading-snug" style={{ color: 'var(--fx-fg-dimmer)' }}>{w.note}</p>}
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionHeader icon={FaCalendarAlt} title="Upcoming: Google Calendar" />
        <div className="divide-y" style={{ borderColor: 'var(--fx-border)' }}>
          {upcoming.map((e) => {
            const { date, time } = formatEventTime(e.start);
            return (
              <div key={e.id} className="fx-row flex items-center gap-4 py-2.5 px-1 -mx-1 rounded">
                <div className="w-20 flex-shrink-0 text-[0.72rem]" style={{ color: 'var(--fx-fg-dimmer)' }}>
                  {date} · {time}
                </div>
                <div className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: 'var(--fx-fg)' }}>
                  {e.title}
                </div>
                <Pill text={e.calendar} tone={e.calendar === 'Training' ? 'accent' : 'default'} />
                <div className="fx-value text-xs flex-shrink-0 hidden sm:block" style={{ color: 'var(--fx-fg-dim)' }}>
                  {e.durationMin}m
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
