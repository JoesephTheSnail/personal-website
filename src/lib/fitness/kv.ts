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
export const ACTIVITY_LOG_KEY = 'fitness:activities:log';

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

/**
 * Atomic increment for fixed-window rate limiting. Returns the count
 * after incrementing; the TTL is only (re-)applied on the first
 * increment in a window, so it always expires `ttlSeconds` after the
 * window started, not after the last request in it. Returns 0 (never
 * rate limited) when KV isn't configured, matching the rest of this
 * module's "missing config degrades open, not closed" pattern — the
 * fallback for an unconfigured cache is mock data, not a broken site.
 */
export async function kvIncrWithExpiry(key: string, ttlSeconds: number): Promise<number> {
  const redis = getClient();
  if (!redis) return 0;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, ttlSeconds);
  return count;
}
