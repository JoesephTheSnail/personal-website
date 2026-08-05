import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const SECRET = 'test-secret';

function post(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/fitness/strava-import', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}` },
    body: JSON.stringify(body),
  });
}

describe('POST /api/fitness/strava-import', () => {
  const ORIGINAL = process.env.HEALTH_WEBHOOK_SECRET;
  beforeEach(() => { process.env.HEALTH_WEBHOOK_SECRET = SECRET; });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.HEALTH_WEBHOOK_SECRET;
    else process.env.HEALTH_WEBHOOK_SECRET = ORIGINAL;
  });

  it('rejects a body with no "days" object', async () => {
    const res = await POST(post({ notDays: true }));
    expect(res.status).toBe(400);
  });

  it('rejects a malformed date key', async () => {
    const res = await POST(post({ days: { 'not-a-date': { runMin: 20 } } }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.invalidDates).toContain('not-a-date');
  });

  it('rejects an entry with a field outside the known workout fields', async () => {
    const res = await POST(post({ days: { '2026-01-01': { runMin: 20, notAField: 5 } } }));
    expect(res.status).toBe(400);
  });

  it('rejects an entry with a non-numeric value', async () => {
    const res = await POST(post({ days: { '2026-01-01': { runMin: 'twenty' } } }));
    expect(res.status).toBe(400);
  });

  it('accepts a valid multi-day payload', async () => {
    const res = await POST(post({
      days: {
        '2026-01-01': { runMin: 21.4, runKm: 5.0 },
        '2026-01-02': { bikeMin: 60, bikeKm: 25 },
      },
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.daysImported).toBe(2);
  });
});
