// Pure aggregation functions that turn a flat Activity[] (from Strava,
// once connected) into the derived stats the Overview tab needs —
// activity mix, time-by-sport, and quick stats. Keeping this separate
// from liveData.ts means it's independently testable and has no
// knowledge of mock data or env vars.
//
// Deliberately sport-agnostic: every aggregate sums/counts across ALL
// activity types (run, ride, swim, strength, walk) rather than filtering
// to running distance, so someone who bikes/swims/lifts as much as they
// run still gets an accurate picture.

import type { Activity, ActivityType, TypeBreakdown, QuickStat, StatTrend } from './types';

const TYPE_LABEL: Record<ActivityType, string> = {
  run: 'Run', ride: 'Ride', swim: 'Swim', walk: 'Walk', strength: 'Strength', 'cross-train': 'Cross-train',
};

// Chosen for what they evoke, not just variety: run=warm/energetic
// (brand accent), ride=open road/sky, swim=water, walk=calm/easy,
// strength=power/intensity. Red is deliberately left out — it's reserved
// elsewhere on this page to mean "negative trend," so using it for a
// sport would send a mixed signal.
const TYPE_COLOR: Record<ActivityType, string> = {
  run: 'var(--fx-accent-bright)',
  ride: 'var(--fx-blue)',
  swim: 'var(--fx-cyan)',
  walk: 'var(--fx-green)',
  strength: 'var(--fx-purple)',
  'cross-train': 'var(--fx-slate)',
};

function mondayOf(dateStr: string): Date {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function computeTrend(thisPeriod: number, lastPeriod: number): StatTrend | undefined {
  if (thisPeriod === 0 && lastPeriod === 0) return undefined;
  if (lastPeriod === 0) return { direction: 'up', pct: 100 };
  const pct = Math.round(((thisPeriod - lastPeriod) / lastPeriod) * 100);
  if (pct === 0) return { direction: 'flat', pct: 0 };
  return { direction: pct > 0 ? 'up' : 'down', pct: Math.abs(pct) };
}

export function computeActivityMix(activities: Activity[]): TypeBreakdown[] {
  const counts = new Map<ActivityType, number>();
  for (const a of activities) counts.set(a.type, (counts.get(a.type) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({ label: TYPE_LABEL[type], value, color: TYPE_COLOR[type] }));
}

export function computeTimeByType(activities: Activity[]): TypeBreakdown[] {
  const minutes = new Map<ActivityType, number>();
  for (const a of activities) minutes.set(a.type, (minutes.get(a.type) ?? 0) + a.durationMin);
  return [...minutes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({ label: TYPE_LABEL[type], value: Math.round(value), color: TYPE_COLOR[type] }));
}

// Total km by sport — strength/core work has no distance to log, so it's
// excluded rather than showing a misleading "0 km" entry.
export function computeMileageBySport(activities: Activity[]): TypeBreakdown[] {
  const km = new Map<ActivityType, number>();
  for (const a of activities) {
    if (a.distanceKm === undefined) continue;
    km.set(a.type, (km.get(a.type) ?? 0) + a.distanceKm);
  }
  return [...km.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({ label: TYPE_LABEL[type], value: Math.round(value), color: TYPE_COLOR[type] }));
}

// Quick stats: This Week broken out by the three headline sports (swim,
// ride, run) each with a trend vs. the prior week, plus one overall
// This Month total across every sport.
export function computeQuickStats(activities: Activity[], now = new Date()): QuickStat[] {
  const nowKey = toDateKey(now);
  const weekStart = toDateKey(mondayOf(nowKey));
  const lastWeekStart = toDateKey(new Date(new Date(`${weekStart}T00:00:00`).getTime() - 7 * 86400000));
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const thisWeek = activities.filter((a) => a.date >= weekStart);
  const lastWeek = activities.filter((a) => a.date >= lastWeekStart && a.date < weekStart);
  const thisMonth = activities.filter((a) => a.date >= monthStart);

  const totalMin = (list: Activity[]) => list.reduce((s, a) => s + a.durationMin, 0);
  const bySport = (list: Activity[], type: ActivityType) => list.filter((a) => a.type === type);
  const sessionLabel = (n: number) => `${n} session${n === 1 ? '' : 's'}`;

  const sportStat = (type: ActivityType, label: string, color: QuickStat['color']): QuickStat => {
    const thisWeekSport = bySport(thisWeek, type);
    const lastWeekSport = bySport(lastWeek, type);
    return {
      label,
      value: formatHoursMinutes(totalMin(thisWeekSport)),
      sublabel: sessionLabel(thisWeekSport.length),
      color,
      trend: computeTrend(totalMin(thisWeekSport), totalMin(lastWeekSport)),
    };
  };

  return [
    sportStat('swim', 'This Week: Swim', 'cyan'),
    sportStat('ride', 'This Week: Bike', 'blue'),
    sportStat('run', 'This Week: Run', 'accent'),
    { label: 'This Month', value: formatHoursMinutes(totalMin(thisMonth)), sublabel: sessionLabel(thisMonth.length), color: 'default' },
  ];
}
