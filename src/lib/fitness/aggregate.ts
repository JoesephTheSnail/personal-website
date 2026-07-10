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

// The dashboard displays exactly five sports — run, ride (bike), swim,
// walk, strength — and nothing else. 'cross-train' is a valid Activity
// type (Strava/HealthKit can report it), but it's intentionally excluded
// everywhere below rather than shown as a catch-all bucket.
const DISPLAYED_TYPES: ActivityType[] = ['run', 'ride', 'swim', 'walk', 'strength'];

export function filterDisplayedSports(activities: Activity[]): Activity[] {
  return activities.filter((a) => DISPLAYED_TYPES.includes(a.type));
}

// "Year to date" scoping for the Session Mix / Mileage / Time-by-Sport
// panels — without this, they'd silently reflect whatever page of raw
// activity history happened to be fetched (e.g. Strava's most recent
// 200), which for a frequent athlete can be a few months and for an
// infrequent one can span multiple years. Both read as "year to date"
// in the UI, so the underlying data has to actually be bounded to it.
export function filterThisYear(activities: Activity[], now = new Date()): Activity[] {
  const year = String(now.getFullYear());
  return activities.filter((a) => a.date.startsWith(year));
}

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

// Session count by sport — "number of sessions done in a year" for each
// of the five displayed sports. Callers pass year-scoped activities
// (filterThisYear); types outside DISPLAYED_TYPES are dropped here too
// so a stray 'cross-train' entry can never leak into the chart.
export function computeActivityMix(activities: Activity[]): TypeBreakdown[] {
  const counts = new Map<ActivityType, number>();
  for (const a of filterDisplayedSports(activities)) counts.set(a.type, (counts.get(a.type) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({ label: TYPE_LABEL[type], value, color: TYPE_COLOR[type] }));
}

export function computeTimeByType(activities: Activity[]): TypeBreakdown[] {
  const minutes = new Map<ActivityType, number>();
  for (const a of filterDisplayedSports(activities)) minutes.set(a.type, (minutes.get(a.type) ?? 0) + a.durationMin);
  return [...minutes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({ label: TYPE_LABEL[type], value: Math.round(value), color: TYPE_COLOR[type] }));
}

// Total km by sport — strength/core work has no distance to log, so it's
// excluded rather than showing a misleading "0 km" entry.
export function computeMileageBySport(activities: Activity[]): TypeBreakdown[] {
  const km = new Map<ActivityType, number>();
  for (const a of filterDisplayedSports(activities)) {
    if (a.distanceKm === undefined) continue;
    km.set(a.type, (km.get(a.type) ?? 0) + a.distanceKm);
  }
  return [...km.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({ label: TYPE_LABEL[type], value: Math.round(value), color: TYPE_COLOR[type] }));
}

// Quick stats: a rolling trailing 7 days (not calendar Monday–Sunday)
// broken out by the three headline sports, each with a trend vs. the
// prior 7 days, plus one overall This Month total across every sport.
// Rolling rather than calendar-week matters here specifically because
// activity data arrives via a weekly manual Strava export (see
// scripts/import-strava-week.mjs) that isn't aligned to any particular
// weekday — a Monday-anchored window would routinely show 0 sessions
// for a sport done a few days before the most recent Monday, even
// though it's well within "the last week" by any normal reading.
export function computeQuickStats(rawActivities: Activity[], now = new Date()): QuickStat[] {
  const activities = filterDisplayedSports(rawActivities);
  const weekStart = toDateKey(new Date(now.getTime() - 6 * 86400000)); // trailing 7 days, inclusive of today
  const lastWeekStart = toDateKey(new Date(now.getTime() - 13 * 86400000));
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
    sportStat('swim', 'Last 7 Days: Swim', 'cyan'),
    sportStat('ride', 'Last 7 Days: Bike', 'blue'),
    sportStat('run', 'Last 7 Days: Run', 'accent'),
    { label: 'This Month', value: formatHoursMinutes(totalMin(thisMonth)), sublabel: sessionLabel(thisMonth.length), color: 'default' },
  ];
}
