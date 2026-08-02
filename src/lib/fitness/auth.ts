// Shared bearer-token check for the three ingestion routes (health-webhook,
// health-auto-export, strava-import) — each requires the same
// HEALTH_WEBHOOK_SECRET, so the check lived identically copy-pasted three
// times before this was pulled out.

import { NextRequest, NextResponse } from 'next/server';

/** Returns an error NextResponse if the request isn't authorized; null if it's clear to proceed. */
export function checkFitnessAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.HEALTH_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'HEALTH_WEBHOOK_SECRET is not configured on the server' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
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
