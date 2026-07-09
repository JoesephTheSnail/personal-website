// Mock data layer for the Fitness dashboard.
//
// Each export below is written as an async "fetcher" — getOverview(),
// getActivityData(), etc. — even though it just returns a fixture today.
// That's deliberate: when Strava/Apple Health/Google Calendar
// integrations are wired up, only the body of these functions needs to
// change (e.g. `fetch('/api/strava/activities')` instead of a literal
// array). Every component in src/components/fitness/ consumes the typed
// shapes from ./types, not raw API responses, so the swap is invisible
// to the UI layer.
//
// Data is hardcoded (no Math.random()) so server- and client-rendered
// output always match — no hydration mismatches. Units are metric
// throughout except body weight (lbs). Dates are anchored to "today" =
// 2026-07-08 (Wednesday) — check the real date before editing these,
// a stale "today" makes the Plan tab's day-of-week labels wrong.

import type { OverviewData, Activity, PlanData, PlanDay } from './types';

// ── Shared activity log (Apple Health / Strava — mock) ──
// The Plan tab's "completed" matching and the Overview aggregates both
// read from this list — there's no separate "Activities" tab anymore,
// but the underlying log still drives those two views.

const ACTIVITIES: Activity[] = [
  { id: 'a1',  date: '2026-07-08', title: 'Upper Body Strength',      type: 'strength', durationMin: 32,    calories: 240 },
  { id: 'a2',  date: '2026-07-07', title: 'Easy Run',                 type: 'run',      durationMin: 25.6,  distanceKm: 4.0,  paceMinPerKm: 6.40, avgHr: 141, elevationM: 22,  calories: 268 },
  { id: 'a3',  date: '2026-07-06', title: 'Long Run',                 type: 'run',      durationMin: 68.4,  distanceKm: 8.1,  paceMinPerKm: 8.44, avgHr: 149, elevationM: 71,  calories: 612 },
  { id: 'a4',  date: '2026-07-05', title: 'Ocean Swim',               type: 'swim',     durationMin: 42,    distanceKm: 1.8,  avgHr: 132, calories: 168 },
  { id: 'a5',  date: '2026-07-04', title: '5K Time Trial',            type: 'run',      durationMin: 21.8,  distanceKm: 5.0,  paceMinPerKm: 4.36, avgHr: 172, elevationM: 9,   calories: 341, isPr: true },
  { id: 'a6',  date: '2026-07-03', title: 'Evening Ride',             type: 'ride',     durationMin: 78,    distanceKm: 32.0, avgHr: 128, elevationM: 240, calories: 612 },
  { id: 'a7',  date: '2026-07-02', title: 'Core & Mobility',          type: 'strength', durationMin: 10,    calories: 62 },
  { id: 'a8',  date: '2026-06-30', title: 'Over and Unders',          type: 'run',      durationMin: 24.6,  distanceKm: 4.8,  paceMinPerKm: 5.13, avgHr: 161, elevationM: 19,  calories: 298 },
  { id: 'a9',  date: '2026-06-29', title: 'Pool Intervals',           type: 'swim',     durationMin: 38,    distanceKm: 1.5,  avgHr: 128, calories: 145 },
  { id: 'a10', date: '2026-06-28', title: 'Density Training: Push',  type: 'strength', durationMin: 30,    calories: 255 },
  { id: 'a11', date: '2026-06-26', title: 'Easy Run',                 type: 'run',      durationMin: 27.4,  distanceKm: 4.4,  paceMinPerKm: 6.23, avgHr: 138, elevationM: 14,  calories: 289 },
  { id: 'a12', date: '2026-06-24', title: 'Long Ride',                type: 'ride',     durationMin: 112,   distanceKm: 48.0, avgHr: 131, elevationM: 410, calories: 890 },
  { id: 'a13', date: '2026-06-22', title: 'Long Run',                 type: 'run',      durationMin: 108.0, distanceKm: 13.0, paceMinPerKm: 8.31, avgHr: 152, elevationM: 143, calories: 940 },
  { id: 'a14', date: '2026-06-20', title: 'Evening Walk',             type: 'walk',     durationMin: 32,    distanceKm: 2.6,  calories: 140 },
];

function hasMatchingActivity(date: string, type: 'run' | 'ride' | 'swim' | 'strength' | 'cross-train'): boolean {
  return ACTIVITIES.some((a) => a.date === date && a.type === type);
}

// ── Apple Health (mock) ─────────────────────────────────

export async function getOverview(): Promise<OverviewData> {
  return {
    today: {
      date: '2026-07-08',
      steps: 8420,
      activeCalories: 612,
      restingCalories: 1780,
      heartRateAvg: 88,
      heartRateResting: 54,
      sleepHours: 7.3,
      sleepQuality: 'good',
      weightLbs: 171.4,
      rings: {
        moveKcal: 612,
        moveGoalKcal: 700,
        exerciseMin: 42,
        exerciseGoalMin: 45,
        standHours: 9,
        standGoalHours: 12,
      },
    },
    lastSyncedAt: null, // mock mode — never actually synced; page.tsx shows "Mock Data" instead of a timestamp
    quickStats: [
      { label: 'This Week: Swim', value: '42m',    sublabel: '1 session',  color: 'cyan',    trend: { direction: 'up',   pct: 18 } },
      { label: 'This Week: Bike', value: '1h 18m', sublabel: '1 session',  color: 'blue',    trend: { direction: 'down', pct: 8 } },
      { label: 'This Week: Run',  value: '2h 6m',  sublabel: '3 sessions', color: 'accent',  trend: { direction: 'up',   pct: 22 } },
      { label: 'This Month',       value: '14h 40m',sublabel: '12 sessions',color: 'default' },
    ],
    activityMix: [
      { label: 'Run',      value: 62, color: 'var(--fx-accent-bright)' },
      { label: 'Strength', value: 40, color: 'var(--fx-purple)' },
      { label: 'Ride',     value: 18, color: 'var(--fx-blue)' },
      { label: 'Swim',     value: 14, color: 'var(--fx-cyan)' },
      { label: 'Walk',     value: 8,  color: 'var(--fx-green)' },
    ],
    timeByType: [
      { label: 'Run',      value: 3800, color: 'var(--fx-accent-bright)' },
      { label: 'Ride',     value: 2400, color: 'var(--fx-blue)' },
      { label: 'Strength', value: 1220, color: 'var(--fx-purple)' },
      { label: 'Swim',     value: 620,  color: 'var(--fx-cyan)' },
      { label: 'Walk',     value: 180,  color: 'var(--fx-green)' },
    ],
    mileageBySport: [
      { label: 'Ride', value: 1040, color: 'var(--fx-blue)' },
      { label: 'Run',  value: 690,  color: 'var(--fx-accent-bright)' },
      { label: 'Swim', value: 33,   color: 'var(--fx-cyan)' },
      { label: 'Walk', value: 15,   color: 'var(--fx-green)' },
    ],
    mileageFunFact: '1,778 km combined, roughly Toronto to Halifax.',
    // Colors chosen for what each metric evokes rather than plain
    // variety: HRV=blue (steady nervous-system signal), resting HR=green
    // (calm/stable is the goal), VO2 max=cyan (oxygen/lungs), sleep=
    // purple (night). None of them use red, since red is reserved
    // elsewhere on the page for "trending down."
    recoveryMetrics: [
      { key: 'hrv',        label: 'HRV',            value: '58 ms',          noteStat: '+4ms',           note: ' vs. 7-day avg', noteSentiment: 'positive', color: 'blue' },
      { key: 'rhr',        label: 'Resting HR',     value: '54 bpm',         noteStat: 'Stable',                                 noteSentiment: 'positive', color: 'green' },
      { key: 'vo2max',     label: 'VO2 Max',        value: '48 mL/kg/min',   noteStat: 'Above average',                          noteSentiment: 'positive', color: 'cyan' },
      { key: 'sleepScore', label: 'Sleep Recovery', value: '82 / 100',       noteStat: 'Good',            note: ': 7.3h sleep',  noteSentiment: 'positive', color: 'purple' },
    ],
  };
}

// ── Strava / Apple Health — full multi-sport activity log ──

export async function getActivityData(): Promise<Activity[]> {
  return ACTIVITIES;
}

// ── Google Calendar (mock) — the Plan ───────────────────

export async function getPlanData(): Promise<PlanData> {
  const days: Array<Omit<PlanDay, 'workouts'> & { workouts: Array<Omit<PlanDay['workouts'][number], 'completed'>> }> = [
    {
      date: '2026-07-06', dayLabel: 'MON', dateLabel: 'Jul 6', isToday: false, isPast: true,
      workouts: [
        { id: 'w0', title: 'Long Run · 8km', type: 'run', durationMin: 65, intensity: 'moderate', source: 'calendar' },
      ],
    },
    {
      date: '2026-07-07', dayLabel: 'TUE', dateLabel: 'Jul 7', isToday: false, isPast: true,
      workouts: [
        { id: 'w1', title: 'Easy Run · 4km', type: 'run', durationMin: 25, intensity: 'easy', source: 'calendar' },
      ],
    },
    {
      date: '2026-07-08', dayLabel: 'WED', dateLabel: 'Jul 8', isToday: true, isPast: false,
      workouts: [
        { id: 'w2', title: 'Upper Body Strength', type: 'strength', durationMin: 30, intensity: 'moderate', source: 'calendar', note: 'Default: upper body pull, universally safe' },
        { id: 'w3', title: 'Core & Mobility', type: 'strength', durationMin: 10, intensity: 'easy', source: 'calendar' },
      ],
    },
    {
      date: '2026-07-09', dayLabel: 'THU', dateLabel: 'Jul 9', isToday: false, isPast: false,
      workouts: [
        { id: 'w4', title: 'Recovery Swim · 1.5km', type: 'swim', durationMin: 35, intensity: 'easy', source: 'calendar' },
      ],
    },
    {
      date: '2026-07-10', dayLabel: 'FRI', dateLabel: 'Jul 10', isToday: false, isPast: false,
      workouts: [
        { id: 'w5', title: 'Over and Unders · 5km', type: 'run', durationMin: 25, intensity: 'moderate', source: 'calendar' },
      ],
    },
    {
      date: '2026-07-11', dayLabel: 'SAT', dateLabel: 'Jul 11', isToday: false, isPast: false,
      workouts: [
        { id: 'w6', title: 'Density Training: Week 3, Day 3', type: 'strength', durationMin: 30, intensity: 'hard', source: 'calendar', note: '2 days before hard/long: push day, upper body only' },
      ],
    },
    {
      date: '2026-07-12', dayLabel: 'SUN', dateLabel: 'Jul 12', isToday: false, isPast: false,
      workouts: [
        { id: 'w8', title: 'Long Ride · 40km', type: 'ride', durationMin: 95, intensity: 'moderate', source: 'calendar' },
      ],
    },
  ];

  const week: PlanDay[] = days.map((day) => ({
    ...day,
    workouts: day.workouts.map((w) => ({
      ...w,
      completed: w.type === 'rest' ? false : hasMatchingActivity(day.date, w.type as 'run' | 'ride' | 'swim' | 'strength' | 'cross-train'),
    })),
  }));

  return {
    week,
    upcoming: [
      { id: 'e1', title: 'Long Run · 16km',           start: '2026-07-13T07:00:00', durationMin: 90, calendar: 'Training' },
      { id: 'e2', title: 'Physio: mobility check-in', start: '2026-07-14T16:30:00', durationMin: 45, calendar: 'Personal' },
      { id: 'e3', title: '5K Time Trial',              start: '2026-07-20T08:00:00', durationMin: 30, calendar: 'Training' },
    ],
  };
}
