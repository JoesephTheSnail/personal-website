// Live-or-mock wiring layer — the only place that decides whether the
// Fitness dashboard shows real synced data or the mock fixtures.
//
// page.tsx imports from here, not from mockData.ts directly. Every
// function below tries the real source first (when configured), and
// falls back to mockData.ts on missing config OR any runtime failure —
// a flaky third-party API must never take down this public page.

import type { OverviewData, Activity, PlanData, DailyVitals, RecoveryMetric } from './types';
import * as mock from './mockData';
import { isKvConfigured, kvGet, HEALTH_VITALS_KEY, ACTIVITY_LOG_KEY } from './kv';
import { isStravaConfigured, fetchStravaActivities } from './strava';
import { isIntervalsConfigured, fetchIntervalsActivities } from './intervalsIcu';
import { isGoogleCalendarConfigured, fetchUpcomingEvents } from './googleCalendar';
import { computeActivityMix, computeTimeByType, computeMileageBySport, computeQuickStats, filterThisYear } from './aggregate';
import { workoutLogToActivities, type WorkoutLog } from './workoutLog';

function startOfYear(now = new Date()): string {
  return `${now.getFullYear()}-01-01`;
}

interface HealthWebhookPayload {
  date: string;
  receivedAt?: string; // set server-side by the webhook route when it writes to KV
  steps?: number;
  activeCalories?: number;
  restingCalories?: number;
  heartRateAvg?: number;
  heartRateResting?: number;
  hrv?: number; // ms, HRV SDNN average
  vo2max?: number; // mL/kg/min, latest sample
  sleepHours?: number;
  weightLbs?: number;
  moveKcal?: number;
  moveGoalKcal?: number;
  exerciseMin?: number;
  exerciseGoalMin?: number;
  standHours?: number;
  standGoalHours?: number;
}

// Apple Health workouts (from the Shortcuts webhook) are the last-resort
// real source, checked only once Strava and intervals.icu have both been
// ruled out.
async function getAppleWorkoutActivities(): Promise<Activity[] | null> {
  if (!isKvConfigured()) return null;
  try {
    const log = await kvGet<WorkoutLog>(ACTIVITY_LOG_KEY);
    if (!log || Object.keys(log).length === 0) return null;
    return workoutLogToActivities(log);
  } catch (err) {
    console.error('[fitness] Reading synced Apple Health workouts failed:', err);
    return null;
  }
}

// Real-source priority: Strava (official API) > intervals.icu (aggregates
// Strava/Garmin/manual) > Apple Health workouts (from the Shortcuts
// webhook) > null, meaning "fall back to mock." `oldest` bounds how far
// back to fetch for sources that support date-range queries (intervals.icu);
// Strava and the Apple Health log return whatever they have.
async function getRealActivities(oldest: string): Promise<Activity[] | null> {
  if (isStravaConfigured()) {
    try {
      return await fetchStravaActivities(200);
    } catch (err) {
      console.error('[fitness] Strava fetch failed, falling back:', err);
    }
  }
  if (isIntervalsConfigured()) {
    try {
      return await fetchIntervalsActivities(oldest);
    } catch (err) {
      console.error('[fitness] intervals.icu fetch failed, falling back:', err);
    }
  }
  return getAppleWorkoutActivities();
}

export async function getActivityData(): Promise<Activity[]> {
  const activities = await getRealActivities(startOfYear());
  return activities ?? mock.getActivityData();
}

async function getStoredVitals(): Promise<HealthWebhookPayload | null> {
  if (!isKvConfigured()) return null;
  try {
    return await kvGet<HealthWebhookPayload>(HEALTH_VITALS_KEY);
  } catch (err) {
    console.error('[fitness] Reading synced Apple Health vitals failed:', err);
    return null;
  }
}

// In full mock mode (no real source connected at all) every field keeps
// the mock's fixture number — that's the intended demo experience. Once
// a real source IS connected, a field the Shortcut/Health Auto Export
// hasn't actually synced becomes null ("N/A") instead of quietly
// borrowing the mock's fabricated number — a live dashboard should never
// show a fake reading as if it were real.
function mergeVitals(stored: HealthWebhookPayload | null, fallback: DailyVitals, isLive: boolean): DailyVitals {
  if (!isLive) return fallback;
  const real = <T,>(v: T | undefined): T | null => v ?? null;
  return {
    date: stored?.date ?? fallback.date,
    steps: real(stored?.steps),
    activeCalories: real(stored?.activeCalories),
    restingCalories: real(stored?.restingCalories),
    heartRateAvg: real(stored?.heartRateAvg),
    heartRateResting: real(stored?.heartRateResting),
    sleepHours: real(stored?.sleepHours),
    sleepQuality: fallback.sleepQuality, // not collected via the webhook payload; keep the mock's qualitative label
    weightLbs: real(stored?.weightLbs),
    rings: {
      moveKcal: real(stored?.moveKcal),
      // Goals are never real — HealthKit doesn't expose them to any
      // third-party app — so they're always null once live, not just
      // when unsynced. See the ActivityRings doc comment in types.ts.
      moveGoalKcal: null,
      exerciseMin: real(stored?.exerciseMin),
      exerciseGoalMin: null,
      standHours: real(stored?.standHours),
      standGoalHours: null,
    },
  };
}

// Sleep prefers a real sleep *score* if one is ever added to the
// payload, but falls back to plain hours-asleep (labeled as such, not
// dressed up as a score) since that's what the Shortcut can actually
// produce today.
//
// In full mock mode every card keeps its fixture value (the demo
// experience). Once live, a metric that hasn't actually synced shows
// "N/A" rather than quietly keeping the mock's fabricated reading —
// e.g. HRV permission not yet granted shouldn't display a fake "58 ms"
// as if it were real.
function buildRecoveryMetrics(mockMetrics: RecoveryMetric[], stored: HealthWebhookPayload | null, isLive: boolean): RecoveryMetric[] {
  if (!isLive) return mockMetrics;

  const notSynced = (m: RecoveryMetric): RecoveryMetric => ({
    ...m,
    value: 'N/A',
    noteStat: 'Not yet synced',
    note: undefined,
    noteSentiment: 'neutral' as const,
  });

  return mockMetrics.map((m) => {
    if (m.key === 'rhr') {
      if (stored?.heartRateResting === undefined) return notSynced(m);
      const rhr = Math.round(stored.heartRateResting);
      return { ...m, value: `${rhr} bpm`, noteStat: 'Synced from Apple Health', note: undefined, noteSentiment: 'neutral' as const };
    }
    if (m.key === 'hrv') {
      if (stored?.hrv === undefined) return notSynced(m);
      return { ...m, value: `${Math.round(stored.hrv)} ms`, noteStat: 'Synced from Apple Health', note: undefined, noteSentiment: 'neutral' as const };
    }
    if (m.key === 'vo2max') {
      if (stored?.vo2max === undefined) return notSynced(m);
      return { ...m, value: `${stored.vo2max.toFixed(1)} mL/kg/min`, noteStat: 'Synced from Apple Health', note: undefined, noteSentiment: 'neutral' as const };
    }
    if (m.key === 'sleepScore') {
      if (stored?.sleepHours === undefined) return notSynced({ ...m, label: 'Time Asleep' });
      const h = Math.floor(stored.sleepHours);
      const min = Math.round((stored.sleepHours - h) * 60);
      return {
        ...m,
        label: 'Time Asleep',
        value: min > 0 ? `${h}h ${min}m` : `${h}h`,
        noteStat: 'Synced from Apple Health',
        note: undefined,
        noteSentiment: 'neutral' as const,
      };
    }
    return m;
  });
}

export async function getOverview(): Promise<OverviewData> {
  // Real activities and the mock+KV reads are fully independent — kick
  // this off before awaiting anything else so the round trips run
  // concurrently instead of one after another.
  const activitiesPromise = getRealActivities(startOfYear());

  const isLive = isKvConfigured();
  const [mockOverview, stored] = await Promise.all([mock.getOverview(), getStoredVitals()]);
  const today = mergeVitals(stored, mockOverview.today, isLive);
  const lastSyncedAt = stored?.receivedAt ?? mockOverview.lastSyncedAt;
  const recoveryMetrics = buildRecoveryMetrics(mockOverview.recoveryMetrics, stored, isLive);

  const activities = await activitiesPromise;
  if (!activities) {
    return { ...mockOverview, today, lastSyncedAt, recoveryMetrics };
  }

  const thisYear = filterThisYear(activities);

  return {
    today,
    lastSyncedAt,
    quickStats: computeQuickStats(activities),
    activityMix: computeActivityMix(thisYear),
    timeByType: computeTimeByType(thisYear),
    mileageBySport: computeMileageBySport(thisYear),
    mileageFunFact: null, // real-world comparison is illustrative flavor text, only meaningful for the mock fixture
    recoveryMetrics,
  };
}

export async function getPlanData(): Promise<PlanData> {
  const mockPlan = await mock.getPlanData();
  if (!isGoogleCalendarConfigured()) return mockPlan;
  try {
    const upcoming = await fetchUpcomingEvents();
    return { ...mockPlan, upcoming };
  } catch (err) {
    console.error('[fitness] Google Calendar fetch failed, falling back to mock upcoming events:', err);
    return mockPlan;
  }
}
