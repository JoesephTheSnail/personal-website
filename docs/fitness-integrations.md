# Fitness dashboard — connecting real data

The `/fitness` page (`src/app/fitness/`) works entirely on mock data out
of the box. Each source below is optional and independent — connect
whichever you want; anything not configured falls back to the mock
fixtures in `src/lib/fitness/mockData.ts` automatically (see
`src/lib/fitness/liveData.ts`, which every page import goes through).

None of this requires deploying an OAuth "connect" route on the public
site. Doing that would let any visitor authorize *their own* account
against your dashboard. Instead, the one-time token setup for Strava and
Google happens locally, on your machine, using the scripts in `scripts/`.

## 1. Storage — Upstash Redis

Needed for: caching synced Apple Health vitals, and Strava/Google OAuth
access tokens (so you're not re-authenticating on every request).

1. Create a free database at [upstash.com](https://upstash.com) (Redis).
2. Copy the REST URL and REST token from the database's dashboard.
3. Add to `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=xxxxx
   ```
4. Add the same two vars in Vercel → Project → Settings → Environment Variables.

## 2. Apple Health

HealthKit has no cloud API — data only leaves your phone if something on
the phone pushes it out. Two options, same destination (both write to
the same Redis record, so either or both can be active):

### 2a. Health Auto Export app (recommended)

The app does the on-device querying/aggregation itself — no Shortcuts
editor, no loops.

**Endpoint:** `POST https://arnavchandra.com/api/fitness/health-auto-export`

1. Pick a long random secret, add to `.env.local` and Vercel:
   ```
   HEALTH_WEBHOOK_SECRET=<generate something like: openssl rand -hex 32>
   ```
2. Install **Health Auto Export – JSON+CSV** from the App Store.
3. Automations → New → **REST API** → URL: the endpoint above → header
   `Authorization: Bearer <HEALTH_WEBHOOK_SECRET>` → format: JSON.
4. Toggle on: Step Count, Active Energy, Resting/Basal Energy, Heart
   Rate, Resting Heart Rate, Weight, Sleep Analysis, Apple Exercise
   Time, Apple Stand Hour. Range: Today.
5. Schedule it (e.g. daily, early morning) and run it once manually to
   confirm — the response body lists which metrics it recognized:
   `{"ok":true,"matched":[...],"unmatched":[...]}`.

Move/Exercise/Stand ring *goals* aren't exposed by HealthKit to any
third-party app — those three are fixed constants in
`src/app/api/fitness/health-auto-export/route.ts` (edit them if your
goals change in the Fitness app). Parsing logic lives in
`src/lib/fitness/healthAutoExportParser.ts`.

### 2b. Manual Shortcuts webhook (free fallback)

**Endpoint:** `POST https://arnavchandra.com/api/fitness/health-webhook`

Same secret as above. Build a Shortcuts automation reading each Health
sample yourself and POSTing a flat JSON body — **only `date` is
required**, everything else is optional and falls back to the mock
value if omitted. The full contract and field list live in
`src/app/api/fitness/health-webhook/route.ts`.

## 3. Strava

Free API, no Strava subscription required — rate-limited (100 req/15min,
1000/day), which is plenty for a personal dashboard refreshing on page
load.

1. Register an app at [strava.com/settings/api](https://www.strava.com/settings/api).
   Set "Authorization Callback Domain" to `localhost`.
2. From the project root, run the local one-time auth helper:
   ```
   export STRAVA_CLIENT_ID=xxxxx
   export STRAVA_CLIENT_SECRET=xxxxx
   node scripts/strava-auth.mjs
   ```
   This opens your browser, you authorize once, and it prints the three
   env vars to paste into `.env.local` (and into Vercel):
   ```
   STRAVA_CLIENT_ID=xxxxx
   STRAVA_CLIENT_SECRET=xxxxx
   STRAVA_REFRESH_TOKEN=xxxxx
   ```
3. Once set, `getActivityData()` and the Overview charts pull real
   activities automatically — see `src/lib/fitness/strava.ts` and
   `src/lib/fitness/aggregate.ts` (the latter turns raw activities into
   weekly/monthly distance, pace trend, distance mix, and personal
   records — no separate PR data source exists, so PRs are approximated
   as the fastest run within ±12% of 5K/10K/half-marathon distance).

## 4. Google Calendar

Populates the "Upcoming" list on the Plan tab. The "This Week's Plan"
grid itself stays mock/manual — a calendar event doesn't carry the
intensity/type/note fields that grid needs.

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com),
   enable the **Google Calendar API**.
2. Configure the OAuth consent screen (External, Testing mode is fine —
   only you will ever authorize).
3. Create OAuth 2.0 credentials, type "Web application", with authorized
   redirect URI `http://localhost:8788/callback`.
4. Run the local one-time auth helper:
   ```
   export GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   export GOOGLE_CLIENT_SECRET=xxxxx
   node scripts/google-calendar-auth.mjs
   ```
   Paste the printed vars into `.env.local` and Vercel:
   ```
   GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxx
   GOOGLE_REFRESH_TOKEN=xxxxx
   ```

## Not connected: Peloton

Peloton has no public API — only unofficial reverse-engineered ones,
which are fragile and against their ToS. Not wired up; the Training
grid's Peloton-style workouts stay manual/mock.

## Checking status

The pill in the top-right of `/fitness` reflects how many of the three
connectable sources (KV, Strava, Google Calendar) are actually
configured — "Mock Data", "Live — N/3 Sources Connected", or "Live —
All Sources Connected". Nothing here requires all three; connect one at
a time and watch the pill update.
