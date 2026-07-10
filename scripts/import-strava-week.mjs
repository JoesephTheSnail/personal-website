#!/usr/bin/env node
// One-time-per-week local helper that reads a Strava bulk-export folder
// and pushes that period's swim/ride/run/walk/strength duration+distance
// to the Fitness dashboard. Run this yourself after each Strava export
// download — it's intentionally NOT a deployed public route, same reason
// as scripts/strava-auth.mjs: no untrusted input should be able to
// overwrite the dashboard's workout history.
//
// Why this exists: Shortcuts has no action to query past HKWorkout
// sessions, and intervals.icu didn't pan out. Strava's own bulk export
// (Settings → My Account → Download or Delete Your Account → Download
// Request) includes activities.csv with real Distance + Moving Time per
// activity, which is all that's actually needed — no need to touch the
// individual .fit.gz/.gpx files in activities/.
//
// Usage:
//   export HEALTH_WEBHOOK_SECRET=xxxxx   (same secret already in Vercel)
//   node scripts/import-strava-week.mjs "/path/to/export_XXXXXXX"
//
// Options:
//   --since=YYYY-MM-DD   Only import activities on/after this date.
//                         Defaults to 7 days ago (today's usual weekly
//                         cadence). Use this to backfill further back.
//   --url=https://...    Override the target endpoint (defaults to the
//                         production site).
//   --dry-run             Parse and print the per-day summary without
//                         POSTing anything.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_URL = 'https://www.arnavchandra.com/api/fitness/strava-import';

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      flags[key] = value ?? true;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

// Minimal RFC4180 CSV parser — Strava's export has quoted fields with
// embedded commas (e.g. the Activity Date column: "Jul 7, 2026, 11:58:12
// AM") and duplicate column names, so this can't be a naive split(',').
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// Column indices in Strava's activities.csv — confirmed against a real
// export (2026-07). "Distance" appears twice (index 6 in the user's
// display unit, which varies by activity type; index 17 consistently in
// meters) — index 17 is used here specifically because it's the one
// that's NOT ambiguous. Same story for "Elapsed Time" (index 5/15, both
// seconds, identical) vs "Moving Time" (index 16) — Moving Time is used
// since it's what "time spent doing X" actually means, excluding stops.
const COL = { DATE: 1, TYPE: 3, MOVING_TIME: 16, DISTANCE_M: 17 };

// Keyword match against Strava's own Activity Type vocabulary — same
// philosophy as healthAutoExportParser.ts's matchSport: resilient to
// naming variants (e.g. "Weight Training" vs "Workout") rather than
// betting on an exact enum. Order matters: specific sports before the
// strength catch-all. Anything else (e.g. "Football (Soccer)", "Yoga"
// as its own type) is intentionally dropped — only these 5 sports show
// on the dashboard.
function matchSport(rawType) {
  const t = rawType.toLowerCase();
  if (t.includes('run')) return 'run';
  if (t.includes('ride') || t.includes('cycl') || t.includes('bik')) return 'ride';
  if (t.includes('swim')) return 'swim';
  if (t.includes('walk') || t.includes('hik')) return 'walk';
  if (t.includes('weight') || t.includes('strength') || t.includes('workout') || t.includes('crossfit')) return 'strength';
  return null;
}

const SPORT_FIELDS = {
  swim: { minKey: 'swimMin', kmKey: 'swimKm' },
  ride: { minKey: 'bikeMin', kmKey: 'bikeKm' },
  run: { minKey: 'runMin', kmKey: 'runKm' },
  walk: { minKey: 'walkMin', kmKey: 'walkKm' },
  strength: { minKey: 'liftMin', kmKey: null },
};

function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const exportDir = positional[0];
  if (!exportDir) {
    console.error('Usage: node scripts/import-strava-week.mjs "/path/to/export_XXXXXXX" [--since=YYYY-MM-DD] [--dry-run] [--url=https://...]');
    process.exit(1);
  }

  const secret = process.env.HEALTH_WEBHOOK_SECRET;
  if (!flags['dry-run'] && !secret) {
    console.error('Missing HEALTH_WEBHOOK_SECRET env var. Export it first, or pass --dry-run to skip the upload.');
    process.exit(1);
  }

  // Truncated to midnight, not a rolling "exactly 168 hours ago" instant —
  // otherwise an activity from earlier in the day 7 days back falls just
  // before the cutoff and gets silently dropped while a later activity on
  // that same calendar day gets included, undercounting that boundary day.
  const since = flags.since
    ? new Date(`${flags.since}T00:00:00`)
    : new Date(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0));

  const csvPath = join(exportDir, 'activities.csv');
  let text;
  try {
    text = readFileSync(csvPath, 'utf-8');
  } catch (err) {
    console.error(`Couldn't read ${csvPath}: ${err.message}`);
    process.exit(1);
  }

  const rows = parseCsv(text);
  const header = rows[0];
  if (!header || header[COL.TYPE] !== 'Activity Type' || header[COL.DATE] !== 'Activity Date') {
    console.error('activities.csv doesn\'t match the expected column layout (Strava may have changed their export format). Aborting rather than importing garbage — tell Claude the new header row so the column indices can be fixed.');
    console.error('Header found:', header?.join(' | '));
    process.exit(1);
  }

  const days = {}; // date -> { runMin, runKm, ... }
  let matchedCount = 0;
  let skippedOld = 0;
  let skippedSport = 0;
  let skippedBadRow = 0;

  for (const row of rows.slice(1)) {
    if (row.length < 18) { skippedBadRow++; continue; }

    const activityDate = new Date(row[COL.DATE]);
    if (Number.isNaN(activityDate.getTime())) { skippedBadRow++; continue; }
    if (activityDate < since) { skippedOld++; continue; }

    const sport = matchSport(row[COL.TYPE]);
    if (!sport) { skippedSport++; continue; }

    const movingTimeSec = Number(row[COL.MOVING_TIME]);
    const distanceM = Number(row[COL.DISTANCE_M]);
    if (Number.isNaN(movingTimeSec)) { skippedBadRow++; continue; }

    // Local calendar date, not a UTC round-trip — avoids an off-by-one-
    // day shift near midnight for timezones behind UTC.
    const y = activityDate.getFullYear();
    const m = String(activityDate.getMonth() + 1).padStart(2, '0');
    const d = String(activityDate.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;

    const { minKey, kmKey } = SPORT_FIELDS[sport];
    days[dateKey] ??= {};
    days[dateKey][minKey] = (days[dateKey][minKey] ?? 0) + movingTimeSec / 60;
    if (kmKey && !Number.isNaN(distanceM) && distanceM > 0) {
      days[dateKey][kmKey] = (days[dateKey][kmKey] ?? 0) + distanceM / 1000;
    }
    matchedCount++;
  }

  const dateKeys = Object.keys(days).sort();
  console.log(`\nParsed ${rows.length - 1} rows from ${csvPath}`);
  console.log(`  ${matchedCount} matched (since ${since.toISOString().slice(0, 10)})`);
  console.log(`  ${skippedOld} skipped (before --since date)`);
  console.log(`  ${skippedSport} skipped (not one of the 5 displayed sports)`);
  console.log(`  ${skippedBadRow} skipped (malformed row)\n`);

  if (dateKeys.length === 0) {
    console.log('Nothing to import in this date range.');
    return;
  }

  console.log('Days to import:');
  for (const date of dateKeys) {
    const entry = days[date];
    const parts = Object.entries(entry).map(([k, v]) => `${k}=${v.toFixed(1)}`);
    console.log(`  ${date}: ${parts.join(', ')}`);
  }
  console.log();

  if (flags['dry-run']) {
    console.log('--dry-run set — not uploading. Re-run without it to actually import.');
    return;
  }

  const url = flags.url ?? DEFAULT_URL;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ days }),
  })
    .then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`Upload failed: ${res.status}`, body);
        process.exit(1);
      }
      console.log(`Uploaded successfully — ${body.daysImported} day(s) written.`);
    })
    .catch((err) => {
      console.error('Upload request failed:', err.message);
      process.exit(1);
    });
}

main();
