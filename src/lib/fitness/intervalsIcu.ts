// Server-only intervals.icu integration. Never imported from a client
// component.
//
// intervals.icu aggregates activities synced in from Strava/Garmin/etc
// (or logged directly) and exposes them over a simple API-key REST API —
// https://forum.intervals.icu/t/api-access-to-intervals-icu/609. No OAuth
// dance: generate a key once at intervals.icu/settings under "Developer
// Settings", then set INTERVALS_ATHLETE_ID + INTERVALS_API_KEY.
//
// Auth is HTTP Basic with the literal username "API_KEY" and the real
// key as the password — not a bearer token.

import type { Activity, ActivityType } from './types';

export function isIntervalsConfigured(): boolean {
  return Boolean(process.env.INTERVALS_ATHLETE_ID && process.env.INTERVALS_API_KEY);
}

// intervals.icu's `type` values mirror Strava's naming (it ingests from
// Strava for most users) — same map shape as strava.ts for consistency,
// trimmed to the types actually seen in intervals.icu's own type list.
const INTERVALS_TYPE_MAP: Record<string, ActivityType> = {
  Run: 'run', TrailRun: 'run', VirtualRun: 'run',
  Ride: 'ride', VirtualRide: 'ride', GravelRide: 'ride', MountainBikeRide: 'ride',
  Swim: 'swim', OpenWaterSwim: 'swim',
  Walk: 'walk', Hike: 'walk',
  WeightTraining: 'strength', Workout: 'strength', Yoga: 'strength', Pilates: 'strength',
};

interface IntervalsActivity {
  id: string;
  name: string;
  type: string;
  start_date_local: string;
  distance?: number; // meters
  moving_time?: number; // seconds
  total_elevation_gain?: number; // meters
  average_heartrate?: number;
  icu_training_load?: number;
}

function mapActivity(a: IntervalsActivity): Activity {
  const type = INTERVALS_TYPE_MAP[a.type] ?? 'cross-train';
  const distanceKm = a.distance && a.distance > 0 ? a.distance / 1000 : undefined;
  const durationMin = (a.moving_time ?? 0) / 60;
  const paceMinPerKm = distanceKm && distanceKm > 0 ? durationMin / distanceKm : undefined;

  return {
    id: `intervals-${a.id}`,
    date: a.start_date_local.slice(0, 10),
    title: a.name,
    type,
    durationMin,
    distanceKm,
    paceMinPerKm,
    avgHr: a.average_heartrate,
    elevationM: a.total_elevation_gain,
  };
}

// oldest/newest are ISO dates (YYYY-MM-DD) — intervals.icu's activities
// endpoint is date-range bounded rather than page-count bounded, which
// is what lets the "year to date" panels actually mean what they say
// instead of silently reflecting whatever page of history was fetched.
export async function fetchIntervalsActivities(oldest: string, newest?: string): Promise<Activity[]> {
  const athleteId = process.env.INTERVALS_ATHLETE_ID;
  const apiKey = process.env.INTERVALS_API_KEY;
  const auth = Buffer.from(`API_KEY:${apiKey}`).toString('base64');

  const params = new URLSearchParams({ oldest });
  if (newest) params.set('newest', newest);

  const res = await fetch(`https://intervals.icu/api/v1/athlete/${athleteId}/activities?${params}`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    throw new Error(`intervals.icu activities fetch failed: ${res.status} ${await res.text()}`);
  }

  const activities = await res.json() as IntervalsActivity[];
  return activities.map(mapActivity);
}
