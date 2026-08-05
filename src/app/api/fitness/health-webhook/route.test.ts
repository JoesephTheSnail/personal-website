import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const SECRET = 'test-secret';

function post(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/fitness/health-webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}`, ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/fitness/health-webhook', () => {
  const ORIGINAL = process.env.HEALTH_WEBHOOK_SECRET;
  beforeEach(() => { process.env.HEALTH_WEBHOOK_SECRET = SECRET; });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.HEALTH_WEBHOOK_SECRET;
    else process.env.HEALTH_WEBHOOK_SECRET = ORIGINAL;
  });

  it('rejects a request without the bearer secret', async () => {
    const req = post({ date: '2026-01-01' }, { authorization: 'Bearer wrong' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects a payload missing "date"', async () => {
    const res = await POST(post({ steps: 8000 }));
    expect(res.status).toBe(400);
  });

  it('rejects a payload where a numeric field is not actually numeric', async () => {
    const res = await POST(post({ date: '2026-01-01', steps: 'a lot' }));
    expect(res.status).toBe(400);
  });

  it('accepts a numeric field sent as a comma-formatted string (Shortcuts sends Text)', async () => {
    const res = await POST(post({ date: '2026-01-01', steps: '8,412' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('accepts a minimal valid payload', async () => {
    const res = await POST(post({ date: '2026-01-01' }));
    expect(res.status).toBe(200);
  });

  it('rejects malformed JSON instead of throwing', async () => {
    const req = new NextRequest('http://localhost/api/fitness/health-webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}` },
      body: '{not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
