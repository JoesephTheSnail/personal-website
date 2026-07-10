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
import { isGoogleCalendarConfigured, fetchUpcomingEvents } from './googleCalendar';
import { computeActivityMix, computeTimeByType, computeMileageBySport, computeQuickStats } from './aggregate';
import { workoutLogToActivities, type WorkoutLog } from './workoutLog';

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

// Apple Health workouts (from the Shortcuts webhook) are the fallback
// real source when Strava isn't connected — checked before giving up
// and showing mock activities.
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

export async function getActivityData(): Promise<Activity[]> {
  if (isStravaConfigured()) {
    try {
      return await fetchStravaActivities();
    } catch (err) {
      console.error('[fitness] Strava fetch failed, falling back to mock activities:', err);
      return mock.getActivityData();
    }
  }
  const appleWorkouts = await getAppleWorkoutActivities();
  return appleWorkouts ?? mock.getActivityData();
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

// Resting HR is the one recovery metric actually present in the webhook/
// Health Auto Export payload today — HRV, VO2 max, and the sleep score
// aren't collected by that schema yet, so they stay on the mock fixture
// until ingestion is extended to cover them. Overriding just this one
// field (rather than leaving all four permanently mock once any source
// is configured) keeps "Live" from silently overclaiming freshness it
// doesn't have.
function buildRecoveryMetrics(mockMetrics: RecoveryMetric[], stored: HealthWebhookPayload | null): RecoveryMetric[] {
  if (stored?.heartRateResting === undefined) return mockMetrics;
  const rhr = Math.round(stored.heartRateResting);
  return mockMetrics.map((m) =>
    m.key === 'rhr' ? { ...m, value: `${rhr} bpm`, noteStat: 'Synced from Apple Health', note: undefined, noteSentiment: 'neutral' } : m
  );
}

export async function getOverview(): Promise<OverviewData> {
  // Strava (if configured), Apple Health workouts (fallback real source),
  // and the mock+KV reads are fully independent — kick this off before
  // awaiting anything else so the round trips run concurrently instead
  // of one after another.
  const activitiesPromise = isStravaConfigured()
    ? fetchStravaActivities(200).catch((err) => {
        console.error('[fitness] Strava aggregation failed, falling back to mock overview:', err);
        return null;
      })
    : getAppleWorkoutActivities();

  const [mockOverview, stored] = await Promise.all([mock.getOverview(), getStoredVitals()]);
  const today = mergeVitals(stored, mockOverview.today);
  const lastSyncedAt = stored?.receivedAt ?? mockOverview.lastSyncedAt;
  const recoveryMetrics = buildRecoveryMetrics(mockOverview.recoveryMetrics, stored);

  const activities = await activitiesPromise;
  if (!activities) {
    return { ...mockOverview, today, lastSyncedAt, recoveryMetrics };
  }

  return {
    today,
    lastSyncedAt,
    quickStats: computeQuickStats(activities),
    activityMix: computeActivityMix(activities),
    timeByType: computeTimeByType(activities),
    mileageBySport: computeMileageBySport(activities),
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
