// Ingestion endpoint for Apple Health data, pushed by an iOS Shortcuts
// automation running on a schedule (e.g. every morning). This is the
// bridge for Apple Health: HealthKit has no cloud API, so the data has
// to be pushed FROM the device — nothing on the server can pull it.
//
// This route only writes to Redis; the public site never reads Strava/
// Google/Apple Health live on a page request, and this endpoint has no
// public GET — it's write-only, and writes require a bearer secret.
//
// Expected request:
//   POST /api/fitness/health-webhook
//   Authorization: Bearer <HEALTH_WEBHOOK_SECRET>
//   Content-Type: application/json
//
// Only "date" is required — every other field is optional. Send
// whatever your Shortcut can easily produce; anything you omit falls
// back to the existing mock value in src/lib/fitness/liveData.ts rather
// than breaking the page. Ship a minimal Shortcut first (steps, active
// calories, heart rate, weight) and add sleep/rings fields later once
// you've got those working:
//
//   {
//     "date": "2026-07-07",
//     "steps": 8420,
//     "activeCalories": 612,
//     "restingCalories": 1780,
//     "heartRateAvg": 88,
//     "heartRateResting": 54,
//     "sleepHours": 7.3,
//     "weightLbs": 171.4,
//     "moveKcal": 612,
//     "moveGoalKcal": 700,
//     "exerciseMin": 42,
//     "exerciseGoalMin": 45,
//     "standHours": 9,
//     "standGoalHours": 12
//   }
//
// In the Shortcuts app: build an automation (e.g. "Time of Day", every
// morning) that reads each Health sample, then use "Get Contents of URL"
// with method POST, this URL, an Authorization header, and a JSON
// request body mapping each field to its Health value.

import { NextRequest, NextResponse } from 'next/server';
import { kvSet, HEALTH_VITALS_KEY } from '@/lib/fitness/kv';

interface HealthWebhookPayload {
  date: string;
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

const OPTIONAL_NUMBER_FIELDS: Array<keyof HealthWebhookPayload> = [
  'steps', 'activeCalories', 'restingCalories', 'heartRateAvg', 'heartRateResting',
  'sleepHours', 'weightLbs', 'moveKcal', 'moveGoalKcal', 'exerciseMin', 'exerciseGoalMin',
  'standHours', 'standGoalHours',
];

export async function POST(req: NextRequest) {
  const secret = process.env.HEALTH_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'HEALTH_WEBHOOK_SECRET is not configured on the server' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Partial<HealthWebhookPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.date !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid "date"' }, { status: 400 });
  }
  // Fields are optional, but if present must actually be numbers —
  // catches the common Shortcuts mistake of leaving a value as Text.
  for (const field of OPTIONAL_NUMBER_FIELDS) {
    const value = body[field];
    if (value !== undefined && (typeof value !== 'number' || Number.isNaN(value))) {
      return NextResponse.json({ error: `"${field}" must be a number if provided` }, { status: 400 });
    }
  }

  await kvSet(HEALTH_VITALS_KEY, { ...body, receivedAt: new Date().toISOString() });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
