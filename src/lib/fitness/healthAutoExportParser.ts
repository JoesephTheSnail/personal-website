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

export interface ParseResult {
  vitals: ParsedVitals;
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

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
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
  const matched: string[] = [];
  const unmatched: string[] = [];

  const metrics = (body as { data?: { metrics?: HAEMetric[] } })?.data?.metrics ?? [];

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

  return { vitals, matched, unmatched };
}
