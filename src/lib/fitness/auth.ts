// Shared bearer-token check for the three ingestion routes (health-webhook,
// health-auto-export, strava-import) — each requires the same
// HEALTH_WEBHOOK_SECRET, so the check lived identically copy-pasted three
// times before this was pulled out.

import { timingSafeEqual, createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { kvIncrWithExpiry } from './kv';

// Comparing the header directly with `!==` short-circuits on the first
// mismatched byte, so response time leaks how many leading characters an
// attacker's guess got right. Hashing both sides to a fixed-length digest
// first, then comparing THAT with timingSafeEqual, removes both the
// early-exit leak and the length leak a direct byte comparison would have.
function safeCompare(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

const RATE_LIMIT = 20; // requests
const RATE_WINDOW_SECONDS = 60;

/**
 * Fixed-window rate limit, keyed by route + caller IP — applied before the
 * auth check so a flood of wrong-secret guesses gets throttled too, not
 * just successfully-authorized traffic. `x-forwarded-for` is Vercel's
 * client-IP header; requests without one (e.g. server-to-server in some
 * setups) share a single bucket rather than bypassing the limit entirely.
 */
export async function checkRateLimit(req: NextRequest, routeName: string): Promise<NextResponse | null> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const window = Math.floor(Date.now() / 1000 / RATE_WINDOW_SECONDS);
  const key = `fitness:ratelimit:${routeName}:${ip}:${window}`;
  const count = await kvIncrWithExpiry(key, RATE_WINDOW_SECONDS);
  if (count > RATE_LIMIT) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  return null;
}

/** Returns an error NextResponse if the request isn't authorized; null if it's clear to proceed. */
export function checkFitnessAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.HEALTH_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'HEALTH_WEBHOOK_SECRET is not configured on the server' }, { status: 503 });
  }
  const provided = req.headers.get('authorization') ?? '';
  if (!safeCompare(provided, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/** Parses the JSON body, returning an error NextResponse in place of a value if it isn't valid JSON. */
export async function parseJsonBody<T = unknown>(req: NextRequest): Promise<{ body: T } | { error: NextResponse }> {
  try {
    return { body: await req.json() as T };
  } catch {
    return { error: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) };
  }
}
