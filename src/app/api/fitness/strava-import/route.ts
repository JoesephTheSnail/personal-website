// Bulk ingestion endpoint for the weekly Strava CSV import
// (scripts/import-strava-week.mjs). Not meant to be called from
// anywhere but that script — it's a deliberately manual, weekly workflow
// (download your Strava export → run the script), not a live
// integration, since intervals.icu didn't work out and Shortcuts has no
// way to query past workouts.
//
// Unlike the other two ingestion routes (which upsert individual fields
// so a partial sync never erases other data), this route REPLACES each
// date's entry wholesale. Strava's weekly export is the authoritative
// source for the days it covers — if a run was deleted from Strava since
// the last import, a merge would leave its stale minutes/km behind, but
// a replace correctly clears it.
//
// Expected request:
//   POST /api/fitness/strava-import
//   Authorization: Bearer <HEALTH_WEBHOOK_SECRET>
//   Content-Type: application/json
//   Body: { "days": { "2026-07-05": { "runMin": 21.4, "runKm": 5.0 }, ... } }

import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSet, ACTIVITY_LOG_KEY } from '@/lib/fitness/kv';
import type { WorkoutLog, WorkoutLogEntry } from '@/lib/fitness/workoutLog';

const NUMBER_FIELDS: Array<keyof WorkoutLogEntry> = [
  'swimMin', 'swimKm', 'bikeMin', 'bikeKm', 'runMin', 'runKm', 'walkMin', 'walkKm', 'liftMin',
];

function isValidEntry(entry: unknown): entry is WorkoutLogEntry {
  if (typeof entry !== 'object' || entry === null) return false;
  return Object.entries(entry).every(([key, value]) => {
    if (!NUMBER_FIELDS.includes(key as keyof WorkoutLogEntry)) return false;
    return typeof value === 'number' && !Number.isNaN(value);
  });
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

  const days = (body as { days?: unknown })?.days;
  if (typeof days !== 'object' || days === null || Array.isArray(days)) {
    return NextResponse.json({ error: '"days" must be an object keyed by ISO date' }, { status: 400 });
  }

  const entries = Object.entries(days as Record<string, unknown>);
  const invalidDates: string[] = [];
  for (const [date, entry] of entries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidEntry(entry)) {
      invalidDates.push(date);
    }
  }
  if (invalidDates.length > 0) {
    return NextResponse.json({ error: 'Invalid date key or entry shape', invalidDates }, { status: 400 });
  }

  const log = ((await kvGet<WorkoutLog>(ACTIVITY_LOG_KEY)) ?? {}) as WorkoutLog;
  for (const [date, entry] of entries) {
    log[date] = entry as WorkoutLogEntry; // full replace — see file header comment
  }
  await kvSet(ACTIVITY_LOG_KEY, log);

  return NextResponse.json({ ok: true, daysImported: entries.length });
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
