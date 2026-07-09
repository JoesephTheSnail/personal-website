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
//   Body: Health Auto Export's native { "data": { "metrics": [...] } } export.
//
// In the app: Automations → New → REST API → paste this URL → add header
// "Authorization: Bearer <secret>" → enable JSON format → toggle on
// Step Count, Active Energy, Resting/Basal Energy, Heart Rate, Resting
// Heart Rate, Weight, Sleep Analysis, Apple Exercise Time, Apple Stand
// Hour → set the export range to "Today" → schedule it (e.g. daily,
// early morning, after your sleep data has finalized).
//
// Move/Exercise/Stand ring GOALS aren't exposed by HealthKit to any
// third-party app (Apple only exposes achieved values, never your
// configured targets) — these three are fixed constants below. Edit
// them if you change your goals in the Fitness app.

import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSet, HEALTH_VITALS_KEY } from '@/lib/fitness/kv';
import { parseHealthAutoExport } from '@/lib/fitness/healthAutoExportParser';

const MOVE_GOAL_KCAL = 700;
const EXERCISE_GOAL_MIN = 45;
const STAND_GOAL_HOURS = 12;

interface StoredVitals {
  date: string;
  receivedAt?: string;
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

export async function POST(req: NextRequest) {
  const secret = process.env.HEALTH_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'HEALTH_WEBHOOK_SECRET is not configured on the server' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { vitals, matched, unmatched } = parseHealthAutoExport(body);

  if (matched.length === 0) {
    return NextResponse.json(
      { error: 'No recognizable metrics found in payload', unmatched },
      { status: 422 },
    );
  }

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
    ...(vitals.sleepHours !== undefined && { sleepHours: vitals.sleepHours }),
    ...(vitals.weightLbs !== undefined && { weightLbs: vitals.weightLbs }),
    ...(vitals.exerciseMin !== undefined && { exerciseMin: vitals.exerciseMin }),
    ...(vitals.standHours !== undefined && { standHours: vitals.standHours }),
    moveGoalKcal: MOVE_GOAL_KCAL,
    exerciseGoalMin: EXERCISE_GOAL_MIN,
    standGoalHours: STAND_GOAL_HOURS,
  };

  await kvSet(HEALTH_VITALS_KEY, merged);

  return NextResponse.json({ ok: true, matched, unmatched });
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
