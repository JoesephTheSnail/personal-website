// Parser for Health Auto Export's REST API JSON payload
// (https://github.com/Lybron/health-auto-export/wiki/API-Export---JSON-Format).
//
// This is the "easy path" for getting real Apple Health data onto the
// site: the user installs the Health Auto Export app, points its REST
// API automation at /api/fitness/health-auto-export, and toggles on the
// metrics they want — no Shortcuts editor, no manual loops.
//
// Two independent sources disagree on exact metric-name casing
// (snake_case like "step_count" vs camelCase like "stepCount"), so
// matching is done on a normalized (lowercased, non-alpha-stripped)
// version of each metric's `name` field via keyword checks rather than
// betting on one exact string. This also means it keeps working if
// Apple/HealthyApps tweaks casing in a future release.

export interface ParsedVitals {
  steps?: number;
  activeCalories?: number;
  restingCalories?: number;
  heartRateAvg?: number;
  heartRateResting?: number;
  sleepHours?: number;
  weightLbs?: number;
  exerciseMin?: number;
  standHours?: number;
}

// The five sports the dashboard displays — anything else (yoga, HIIT,
// etc.) is intentionally dropped rather than shown as a catch-all.
export type WorkoutSport = 'run' | 'ride' | 'swim' | 'walk' | 'strength';

export interface ParsedWorkout {
  sport: WorkoutSport;
  date: string; // ISO date, from the workout's start timestamp
  durationMin: number;
  distanceKm?: number;
}

export interface ParseResult {
  vitals: ParsedVitals;
  workouts: ParsedWorkout[];
  matched: string[];
  unmatched: string[];
}

interface HAEDataPoint {
  date?: string;
  qty?: number;
  Avg?: number;
  Min?: number;
  Max?: number;
  asleep?: number;
  totalSleep?: number;
  [key: string]: unknown;
}

interface HAEMetric {
  name?: string;
  units?: string;
  data?: HAEDataPoint[];
}

// Workouts export format (v1 and v2 share these field names) —
// https://github.com/Lybron/health-auto-export/wiki/API-Export---JSON-Format
interface HAEWorkout {
  name?: string; // activity type, e.g. "Running", "Traditional Strength Training"
  start?: string; // "yyyy-MM-dd HH:mm:ss Z"
  duration?: number; // seconds
  distance?: { qty?: number; units?: string };
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

// Keyword match, same philosophy as the metric matching below — more
// resilient to Apple/HealthyApps renaming a workout type than betting on
// an exact enum string. Order matters: check the more specific sports
// before the catch-all 'strength' bucket.
function matchSport(rawName: string): WorkoutSport | null {
  const n = normalize(rawName);
  if (n.includes('run')) return 'run';
  if (n.includes('cycl') || n.includes('bik') || n.includes('ride')) return 'ride';
  if (n.includes('swim')) return 'swim';
  if (n.includes('walk') || n.includes('hik')) return 'walk';
  if (n.includes('strength') || n.includes('weight') || n.includes('yoga') || n.includes('pilates') || n.includes('functional') || n.includes('crossfit')) return 'strength';
  return null;
}

// Only 'mi' and 'km' are documented units for the workouts distance
// field; anything else is left unconverted (undefined) rather than
// guessed, so a duration-only entry is still captured instead of the
// whole workout being dropped.
function distanceToKm(distance: { qty?: number; units?: string } | undefined): number | undefined {
  if (!distance || typeof distance.qty !== 'number') return undefined;
  const unit = (distance.units ?? '').toLowerCase();
  if (unit === 'km') return distance.qty;
  if (unit === 'mi') return distance.qty * 1.60934;
  return undefined;
}

function latestPoint(data: HAEDataPoint[] | undefined): HAEDataPoint | undefined {
  if (!data || data.length === 0) return undefined;
  let best = data[0];
  let bestTime = Date.parse(best.date ?? '');
  for (const point of data) {
    const t = Date.parse(point.date ?? '');
    if (!Number.isNaN(t) && (Number.isNaN(bestTime) || t > bestTime)) {
      best = point;
      bestTime = t;
    }
  }
  return best;
}

function kgToLbs(kg: number): number {
  return kg * 2.20462262;
}

export function parseHealthAutoExport(body: unknown): ParseResult {
  const vitals: ParsedVitals = {};
  const workouts: ParsedWorkout[] = [];
  const matched: string[] = [];
  const unmatched: string[] = [];

  const data = (body as { data?: { metrics?: HAEMetric[]; workouts?: HAEWorkout[] } })?.data;
  const metrics = data?.metrics ?? [];
  const rawWorkouts = data?.workouts ?? [];

  for (const w of rawWorkouts) {
    const rawName = w.name ?? '';
    const sport = matchSport(rawName);
    // The "yyyy-MM-dd HH:mm:ss Z" start string is already local time —
    // slicing it directly avoids an off-by-one-day shift near midnight
    // that a UTC round-trip through `new Date(...).toISOString()` would
    // introduce for timezones behind UTC.
    const date = (w.start ?? '').slice(0, 10);
    if (!sport || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof w.duration !== 'number') {
      unmatched.push(rawName || '(unnamed workout)');
      continue;
    }
    workouts.push({
      sport,
      date,
      durationMin: w.duration / 60,
      distanceKm: distanceToKm(w.distance),
    });
    matched.push(rawName);
  }

  for (const metric of metrics) {
    const rawName = metric.name ?? '';
    const n = normalize(rawName);
    const point = latestPoint(metric.data);
    if (!point) { unmatched.push(rawName); continue; }

    let hit = true;

    if (n.includes('restingheart') || (n.includes('resting') && n.includes('heart'))) {
      vitals.heartRateResting = point.Avg ?? point.qty;
    } else if (!n.includes('variability') && !n.includes('hrv') && n.includes('heart')) {
      vitals.heartRateAvg = point.Avg ?? point.qty;
    } else if (n.includes('step')) {
      vitals.steps = point.qty;
    } else if (n.includes('active') && n.includes('energy')) {
      vitals.activeCalories = point.qty;
    } else if (n.includes('basal') || (n.includes('resting') && n.includes('energy'))) {
      vitals.restingCalories = point.qty;
    } else if (n.includes('weight') || n.includes('bodymass')) {
      const qty = point.qty;
      if (typeof qty === 'number') {
        vitals.weightLbs = (metric.units ?? '').toLowerCase().includes('kg') ? kgToLbs(qty) : qty;
      }
    } else if (n.includes('sleep')) {
      const hours = point.asleep ?? point.totalSleep;
      if (typeof hours === 'number') {
        vitals.sleepHours = hours > 24 ? hours / 60 : hours; // guard against a minutes-based export
      }
    } else if (n.includes('exercise') && n.includes('time')) {
      vitals.exerciseMin = point.qty;
    } else if (n.includes('stand')) {
      const qty = point.qty;
      if (typeof qty === 'number') {
        vitals.standHours = qty > 24 ? qty / 60 : qty; // guard against a minutes-based export
      }
    } else {
      hit = false;
    }

    (hit ? matched : unmatched).push(rawName);
  }

  return { vitals, workouts, matched, unmatched };
}
