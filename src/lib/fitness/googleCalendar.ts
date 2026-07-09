// Server-only Google Calendar integration — plain fetch, no SDK. Never
// imported from a client component.
//
// Maps calendar events onto PlanData.upcoming (the "Upcoming — Google
// Calendar" list). The "This Week's Plan" grid encodes intensity/type/
// notes that a bare calendar event doesn't carry, so that grid stays
// mock/manual for now — only the upcoming-events list is live.
//
// The one-time setup step (minting the initial refresh token) is done
// locally with `node scripts/google-calendar-auth.mjs`, never through a
// deployed public route, for the same reason as Strava: a public
// "connect" route would let any visitor authorize their own Google
// account against this dashboard.

import { kvGet, kvSet } from './kv';
import type { UpcomingEvent } from './types';

const ACCESS_TOKEN_KEY = 'fitness:google:access_token';

interface CachedAccessToken {
  accessToken: string;
  expiresAt: number; // unix seconds
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
}

async function getAccessToken(): Promise<string> {
  const cached = await kvGet<CachedAccessToken>(ACCESS_TOKEN_KEY);
  const nowSec = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 60 > nowSec) {
    return cached.accessToken;
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  const expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
  await kvSet(ACCESS_TOKEN_KEY, { accessToken: data.access_token, expiresAt });

  return data.access_token;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

function eventDurationMin(ev: GoogleCalendarEvent): number {
  const start = ev.start.dateTime ?? ev.start.date;
  const end = ev.end.dateTime ?? ev.end.date;
  if (!start || !end) return 0;
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

export async function fetchUpcomingEvents(maxResults = 5): Promise<UpcomingEvent[]> {
  const accessToken = await getAccessToken();
  const timeMin = new Date().toISOString();
  const params = new URLSearchParams({
    timeMin,
    maxResults: String(maxResults),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Google Calendar fetch failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { items: GoogleCalendarEvent[] };
  return data.items.map((ev) => ({
    id: ev.id,
    title: ev.summary ?? '(untitled event)',
    start: ev.start.dateTime ?? ev.start.date ?? timeMin,
    durationMin: eventDurationMin(ev),
    calendar: 'Google Calendar',
  }));
}
