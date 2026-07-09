// Server-only Strava integration. Never imported from a client component.
//
// Strava's developer API is free (rate-limited, no Pro subscription
// required) — https://developers.strava.com. The one-time setup step
// (minting the initial refresh token via OAuth consent) is done locally
// with `node scripts/strava-auth.mjs`, never through a deployed public
// route — a public "connect Strava" route would let any site visitor
// authorize their OWN Strava account against this dashboard.

import { kvGet, kvSet } from './kv';
import type { Activity, ActivityType } from './types';

const ACCESS_TOKEN_KEY = 'fitness:strava:access_token';
const REFRESH_TOKEN_KEY = 'fitness:strava:refresh_token';

interface CachedAccessToken {
  accessToken: string;
  expiresAt: number; // unix seconds
}

export function isStravaConfigured(): boolean {
  return Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET && process.env.STRAVA_REFRESH_TOKEN);
}

async function getRefreshToken(): Promise<string> {
  const cached = await kvGet<string>(REFRESH_TOKEN_KEY);
  return cached ?? process.env.STRAVA_REFRESH_TOKEN!;
}

async function getAccessToken(): Promise<string> {
  const cached = await kvGet<CachedAccessToken>(ACCESS_TOKEN_KEY);
  const nowSec = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 60 > nowSec) {
    return cached.accessToken;
  }

  const refreshToken = await getRefreshToken();
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { access_token: string; refresh_token: string; expires_at: number };

  await kvSet(ACCESS_TOKEN_KEY, { accessToken: data.access_token, expiresAt: data.expires_at });
  // Strava may rotate the refresh token — persist the new one so future
  // refreshes don't rely on a stale value baked into env vars.
  if (data.refresh_token) {
    await kvSet(REFRESH_TOKEN_KEY, data.refresh_token);
  }

  return data.access_token;
}

const STRAVA_TYPE_MAP: Record<string, ActivityType> = {
  Run: 'run', TrailRun: 'run', VirtualRun: 'run',
  Ride: 'ride', VirtualRide: 'ride', GravelRide: 'ride', MountainBikeRide: 'ride',
  Swim: 'swim',
  Walk: 'walk', Hike: 'walk',
  WeightTraining: 'strength', Workout: 'strength', Yoga: 'strength', Pilates: 'strength',
};

interface StravaSummaryActivity {
  id: number;
  name: string;
  type: string;
  start_date_local: string;
  distance: number; // meters
  moving_time: number; // seconds
  total_elevation_gain: number; // meters
  average_heartrate?: number;
  calories?: number;
}

function mapActivity(a: StravaSummaryActivity): Activity {
  const type = STRAVA_TYPE_MAP[a.type] ?? 'cross-train';
  const distanceKm = a.distance > 0 ? a.distance / 1000 : undefined;
  const durationMin = a.moving_time / 60;
  const paceMinPerKm = distanceKm && distanceKm > 0 ? durationMin / distanceKm : undefined;

  return {
    id: `strava-${a.id}`,
    date: a.start_date_local.slice(0, 10),
    title: a.name,
    type,
    durationMin,
    distanceKm,
    paceMinPerKm,
    avgHr: a.average_heartrate,
    elevationM: a.total_elevation_gain,
    calories: a.calories,
  };
}

export async function fetchStravaActivities(perPage = 30): Promise<Activity[]> {
  const accessToken = await getAccessToken();
  const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Strava activities fetch failed: ${res.status} ${await res.text()}`);
  }

  const activities = await res.json() as StravaSummaryActivity[];
  return activities.map(mapActivity);
}
