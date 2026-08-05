import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { checkFitnessAuth, checkRateLimit } from './auth';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/fitness/health-webhook', {
    method: 'POST',
    headers,
  });
}

describe('checkFitnessAuth', () => {
  const ORIGINAL_SECRET = process.env.HEALTH_WEBHOOK_SECRET;

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.HEALTH_WEBHOOK_SECRET;
    else process.env.HEALTH_WEBHOOK_SECRET = ORIGINAL_SECRET;
  });

  it('returns 503 when no secret is configured on the server', async () => {
    delete process.env.HEALTH_WEBHOOK_SECRET;
    const res = checkFitnessAuth(makeRequest());
    expect(res?.status).toBe(503);
  });

  it('returns 401 when the request has no authorization header', () => {
    process.env.HEALTH_WEBHOOK_SECRET = 'test-secret';
    const res = checkFitnessAuth(makeRequest());
    expect(res?.status).toBe(401);
  });

  it('returns 401 for a wrong secret, including one that only differs in length', () => {
    process.env.HEALTH_WEBHOOK_SECRET = 'test-secret';
    const short = checkFitnessAuth(makeRequest({ authorization: 'Bearer wrong' }));
    const long = checkFitnessAuth(makeRequest({ authorization: 'Bearer test-secret-but-longer' }));
    expect(short?.status).toBe(401);
    expect(long?.status).toBe(401);
  });

  it('returns null (authorized) for the correct secret', () => {
    process.env.HEALTH_WEBHOOK_SECRET = 'test-secret';
    const res = checkFitnessAuth(makeRequest({ authorization: 'Bearer test-secret' }));
    expect(res).toBeNull();
  });
});

describe('checkRateLimit', () => {
  it('never blocks when KV is not configured — degrades open, not closed', async () => {
    // No UPSTASH_REDIS_REST_URL/TOKEN in the test environment, so
    // kvIncrWithExpiry short-circuits to 0 on every call.
    for (let i = 0; i < 25; i++) {
      const res = await checkRateLimit(makeRequest(), 'test-route');
      expect(res).toBeNull();
    }
  });
});

describe('checkRateLimit with KV configured', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 429 once the per-window count exceeds the limit', async () => {
    vi.doMock('./kv', () => ({
      kvIncrWithExpiry: vi.fn().mockResolvedValue(21), // over the 20/min limit
    }));
    const { checkRateLimit: rateLimitWithMockedKv } = await import('./auth');
    const res = await rateLimitWithMockedKv(makeRequest(), 'test-route');
    expect(res?.status).toBe(429);
  });

  it('allows the request through while under the limit', async () => {
    vi.doMock('./kv', () => ({
      kvIncrWithExpiry: vi.fn().mockResolvedValue(5),
    }));
    const { checkRateLimit: rateLimitWithMockedKv } = await import('./auth');
    const res = await rateLimitWithMockedKv(makeRequest(), 'test-route');
    expect(res).toBeNull();
  });
});
