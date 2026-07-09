// Thin wrapper around Upstash Redis for the Fitness dashboard's server-side
// cache. All real-integration data (synced Apple Health vitals, cached
// Strava activities, cached Google Calendar events) is written here by
// server-only code and read back by the same — it is never exposed to
// the browser, and the public site never calls Strava/Google/the health
// webhook live on a page request.
//
// Returns `null` when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
// aren't set, so every caller can check `isKvConfigured()` and fall back
// to mock data instead of throwing.

import { Redis } from '@upstash/redis';

export const HEALTH_VITALS_KEY = 'fitness:vitals:today';

let client: Redis | null = null;
let attempted = false;

function getClient(): Redis | null {
  if (attempted) return client;
  attempted = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  client = new Redis({ url, token });
  return client;
}

export function isKvConfigured(): boolean {
  return getClient() !== null;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const redis = getClient();
  if (!redis) return null;
  return redis.get<T>(key);
}

export async function kvSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const redis = getClient();
  if (!redis) return;
  if (ttlSeconds) {
    await redis.set(key, value, { ex: ttlSeconds });
  } else {
    await redis.set(key, value);
  }
}
