// Ingestion endpoint for the Health Auto Export app
// (https://apps.apple.com/us/app/health-auto-export-json-csv/id1115567069).
//
// This is the recommended way to get real Apple Health data onto the
// site — Apple Health/HealthKit has no cloud API of its own, so data
// always has to be pushed FROM the device. Health Auto Export does the
// on-device querying/aggregation (steps, calories, heart rate, sleep,
// exercise time, stand hours, weight) and POSTs it here on a schedule
// you set inside the app. Setup is: install the app, add a REST API
// automation pointed at this URL with an Authorization header, toggle
// on the metrics below, pick a schedule. No Shortcuts editing needed.
//
// (There is also a lower-level /api/fitness/health-webhook route that
// takes a hand-built flat JSON body, kept as a free/manual fallback for
// anyone who'd rather not install an app — both write to the same
// Redis key, so either (or both) can feed the dashboard.)
//
// Expected request:
//   POST /api/fitness/health-auto-export
//   Authorization: Bearer <HEALTH_WEBHOOK_SECRET>
//   Content-Type: application/json
//   Body: Health Auto Export's native { "data": { "metrics": [...], "workouts": [...] } } export.
//
// In the app: Automations → New → REST API → paste this URL → add header
// "Authorization: Bearer <secret>" → enable JSON format → toggle on
// Step Count, Active Energy, Resting/Basal Energy, Heart Rate, Resting
// Heart Rate, Heart Rate Variability, VO2 Max, Weight, Sleep Analysis,
// Apple Exercise Time, Apple Stand Hour, AND Workouts → set the export
// range to "Today" → schedule it (e.g. daily, early morning, after your
// sleep data has finalized).
//
// Workouts (run/ride/swim/walk/strength) come through the same payload's
// separate "workouts" array — this is what actually solves "get my
// workout time + distance off my Watch" for free: unlike Shortcuts,
// which has no action to query past HKWorkout sessions, Health Auto
// Export does the on-device workout query itself and exports full
// per-workout duration + distance. Toggling "Workouts" on in the app's
// export settings is what populates it.
//
// Move/Exercise/Stand ring GOALS aren't exposed by HealthKit to any
// third-party app (Apple only exposes achieved values, never your
// configured targets), so this route never writes them — they render
// as "N/A" on the dashboard rather than a guessed constant.

import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSet, HEALTH_VITALS_KEY, ACTIVITY_LOG_KEY } from '@/lib/fitness/kv';
import { parseHealthAutoExport, type ParsedWorkout } from '@/lib/fitness/healthAutoExportParser';
import { upsertWorkoutDay, type WorkoutLog, type WorkoutLogEntry } from '@/lib/fitness/workoutLog';
import { checkFitnessAuth, parseJsonBody } from '@/lib/fitness/auth';

const SPORT_FIELD: Record<ParsedWorkout['sport'], { minKey: keyof WorkoutLogEntry; kmKey?: keyof WorkoutLogEntry }> = {
  swim: { minKey: 'swimMin', kmKey: 'swimKm' },
  ride: { minKey: 'bikeMin', kmKey: 'bikeKm' },
  run: { minKey: 'runMin', kmKey: 'runKm' },
  walk: { minKey: 'walkMin', kmKey: 'walkKm' },
  strength: { minKey: 'liftMin' }, // no distance field — strength has no km to log
};

// Multiple same-sport workouts on one day (e.g. two runs) are summed
// into that day's single entry, matching how the Shortcuts webhook's
// flat per-day fields already work.
function groupWorkoutsByDate(workouts: ParsedWorkout[]): Map<string, WorkoutLogEntry> {
  const byDate = new Map<string, WorkoutLogEntry>();
  for (const w of workouts) {
    const entry = byDate.get(w.date) ?? {};
    const { minKey, kmKey } = SPORT_FIELD[w.sport];
    entry[minKey] = (entry[minKey] ?? 0) + w.durationMin;
    if (kmKey && w.distanceKm !== undefined) {
      entry[kmKey] = (entry[kmKey] ?? 0) + w.distanceKm;
    }
    byDate.set(w.date, entry);
  }
  return byDate;
}

interface StoredVitals {
  date: string;
  receivedAt?: string;
  steps?: number;
  activeCalories?: number;
  restingCalories?: number;
  heartRateAvg?: number;
  heartRateResting?: number;
  hrv?: number;
  vo2max?: number;
  sleepHours?: number;
  weightLbs?: number;
  moveKcal?: number;
  moveGoalKcal?: number;
  exerciseMin?: number;
  exerciseGoalMin?: number;
  standHours?: number;
  standGoalHours?: number;
}

export async function POST(req: NextRequest) {
  const authError = checkFitnessAuth(req);
  if (authError) return authError;

  const parsed = await parseJsonBody(req);
  if ('error' in parsed) return parsed.error;

  const { vitals, workouts, matched, unmatched } = parseHealthAutoExport(parsed.body);

  if (Object.keys(vitals).length === 0 && workouts.length === 0) {
    return NextResponse.json(
      { error: 'No recognizable metrics or workouts found in payload', unmatched },
      { status: 422 },
    );
  }

  if (Object.keys(vitals).length > 0) {
    // Merge over whatever's already stored rather than replacing wholesale —
    // if steps/calories arrive on one automation and weight on a separate
    // weekly one, neither write should erase the other's fields.
    const existing = (await kvGet<StoredVitals>(HEALTH_VITALS_KEY)) ?? { date: '' };

    const merged: StoredVitals = {
      ...existing,
      date: new Date().toISOString().slice(0, 10),
      receivedAt: new Date().toISOString(),
      ...(vitals.steps !== undefined && { steps: vitals.steps }),
      ...(vitals.activeCalories !== undefined && { activeCalories: vitals.activeCalories, moveKcal: vitals.activeCalories }),
      ...(vitals.restingCalories !== undefined && { restingCalories: vitals.restingCalories }),
      ...(vitals.heartRateAvg !== undefined && { heartRateAvg: vitals.heartRateAvg }),
      ...(vitals.heartRateResting !== undefined && { heartRateResting: vitals.heartRateResting }),
      ...(vitals.hrv !== undefined && { hrv: vitals.hrv }),
      ...(vitals.vo2max !== undefined && { vo2max: vitals.vo2max }),
      ...(vitals.sleepHours !== undefined && { sleepHours: vitals.sleepHours }),
      ...(vitals.weightLbs !== undefined && { weightLbs: vitals.weightLbs }),
      ...(vitals.exerciseMin !== undefined && { exerciseMin: vitals.exerciseMin }),
      ...(vitals.standHours !== undefined && { standHours: vitals.standHours }),
      // Move/Exercise/Stand ring GOALS are never set here — HealthKit
      // doesn't expose a user's configured targets to any third-party
      // app, so there's no honest number to write. mergeVitals() in
      // liveData.ts renders them as "N/A" once live rather than a
      // guessed constant.
    };

    await kvSet(HEALTH_VITALS_KEY, merged);
  }

  if (workouts.length > 0) {
    const log = ((await kvGet<WorkoutLog>(ACTIVITY_LOG_KEY)) ?? {}) as WorkoutLog;
    for (const [date, entry] of groupWorkoutsByDate(workouts)) {
      upsertWorkoutDay(log, date, entry);
    }
    await kvSet(ACTIVITY_LOG_KEY, log);
  }

  return NextResponse.json({ ok: true, matched, unmatched, workoutsSynced: workouts.length });
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
