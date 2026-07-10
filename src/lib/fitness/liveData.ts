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

function mergeVitals(stored: HealthWebhookPayload | null, fallback: DailyVitals): DailyVitals {
  if (!stored) return fallback;
  // Per-field merge — a Shortcut that only sends steps/calories/heart
  // rate/weight still works fine; anything omitted keeps the mock's
  // plausible value rather than showing 0 or breaking the rings.
  return {
    date: stored.date ?? fallback.date,
    steps: stored.steps ?? fallback.steps,
    activeCalories: stored.activeCalories ?? fallback.activeCalories,
    restingCalories: stored.restingCalories ?? fallback.restingCalories,
    heartRateAvg: stored.heartRateAvg ?? fallback.heartRateAvg,
    heartRateResting: stored.heartRateResting ?? fallback.heartRateResting,
    sleepHours: stored.sleepHours ?? fallback.sleepHours,
    sleepQuality: fallback.sleepQuality, // not collected via the webhook payload; keep the mock's qualitative label
    weightLbs: stored.weightLbs ?? fallback.weightLbs,
    rings: {
      moveKcal: stored.moveKcal ?? fallback.rings.moveKcal,
      moveGoalKcal: stored.moveGoalKcal ?? fallback.rings.moveGoalKcal,
      exerciseMin: stored.exerciseMin ?? fallback.rings.exerciseMin,
      exerciseGoalMin: stored.exerciseGoalMin ?? fallback.rings.exerciseGoalMin,
      standHours: stored.standHours ?? fallback.rings.standHours,
      standGoalHours: stored.standGoalHours ?? fallback.rings.standGoalHours,
    },
  };
}

// Resting HR and sleep are the two recovery signals actually present in
// the webhook payload today — HRV and VO2 max aren't collected by that
// schema yet, so they stay on the mock fixture until ingestion is
// extended to cover them. Sleep prefers a real sleep *score* if one is
// ever added to the payload, but falls back to plain hours-asleep
// (labeled as such, not dressed up as a score) since that's what the
// Shortcut can actually produce today. Overriding fields individually
// (rather than going all-mock or all-live) keeps "Live" from silently
// overclaiming freshness it doesn't have for the two metrics not yet wired.
function buildRecoveryMetrics(mockMetrics: RecoveryMetric[], stored: HealthWebhookPayload | null): RecoveryMetric[] {
  return mockMetrics.map((m) => {
    if (m.key === 'rhr' && stored?.heartRateResting !== undefined) {
      const rhr = Math.round(stored.heartRateResting);
      return { ...m, value: `${rhr} bpm`, noteStat: 'Synced from Apple Health', note: undefined, noteSentiment: 'neutral' as const };
    }
    if (m.key === 'sleepScore' && stored?.sleepHours !== undefined) {
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

  const [mockOverview, stored] = await Promise.all([mock.getOverview(), getStoredVitals()]);
  const today = mergeVitals(stored, mockOverview.today);
  const lastSyncedAt = stored?.receivedAt ?? mockOverview.lastSyncedAt;
  const recoveryMetrics = buildRecoveryMetrics(mockOverview.recoveryMetrics, stored);

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
