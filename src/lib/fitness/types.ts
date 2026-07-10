// Shared domain types for the Fitness dashboard.
//
// These shapes are intentionally normalized to look like what real
// integrations (Apple HealthKit, Strava, Google Calendar) would return,
// so `mockData.ts` can later be swapped for real fetchers without
// touching any component.
//
// Units: metric throughout (km, meters, min/km) — except body weight,
// which stays in lbs.

export type IntensityLevel = 'easy' | 'moderate' | 'hard' | 'rest';

// Ring GOALS (moveGoalKcal/exerciseGoalMin/standGoalHours) are nullable
// because HealthKit never exposes a user's configured targets to any
// third-party app or Shortcut — only achieved values. In live mode
// there's no honest number to show for a goal, so it's null ("N/A")
// rather than a guessed constant. Achieved values are nullable too, for
// the same reason as DailyVitals below: a live-but-not-yet-synced field
// must not silently borrow the mock's fabricated number.
export interface ActivityRings {
  moveKcal: number | null;
  moveGoalKcal: number | null;
  exerciseMin: number | null;
  exerciseGoalMin: number | null;
  standHours: number | null;
  standGoalHours: number | null;
}

// Nullable fields (all but `date`) render as "N/A" in live mode when
// not yet synced, rather than falling back to mockData.ts's fixture —
// see mergeVitals() in liveData.ts. In full mock mode every field is
// always a real (fixture) number; null only appears once a real source
// is connected.
export interface DailyVitals {
  date: string; // ISO date
  steps: number | null;
  activeCalories: number | null;
  restingCalories: number | null;
  heartRateAvg: number | null;
  heartRateResting: number | null;
  sleepHours: number | null;
  sleepQuality: 'poor' | 'fair' | 'good' | 'great';
  weightLbs: number | null;
  rings: ActivityRings;
}

export interface StatTrend {
  direction: 'up' | 'down' | 'flat';
  pct: number; // absolute value; direction carries the sign
}

// Shared across every tinted card on the Fitness dashboard (quick stats,
// recovery metrics, session mix, mileage). Kept as one union so the tint
// lookup tables in ui.tsx/OverviewSection.tsx can be typed as
// `Record<FxColor, ...>` — an exhaustive record — instead of
// `Record<string, ...>`. That makes a color added here without a matching
// tint-table entry a compile error instead of a runtime crash.
export type FxColor = 'default' | 'blue' | 'green' | 'accent' | 'purple' | 'cyan';

export interface QuickStat {
  label: string;
  value: string;
  sublabel?: string;
  color?: FxColor;
  trend?: StatTrend; // vs. last week
}

// Recovery / readiness metrics — HRV and resting heart rate track
// autonomic nervous system load day to day, VO2 max is the slower-moving
// cardio-fitness baseline, and the sleep score folds sleep duration +
// quality into one number. All four are things Apple Watch/HealthKit
// actually measures on its own — no external sensors needed.
export interface RecoveryMetric {
  key: 'hrv' | 'rhr' | 'vo2max' | 'sleepScore';
  label: string; // "HRV", "Resting HR", "VO2 Max", "Sleep Recovery"
  value: string;
  noteStat?: string; // the actual judgment, e.g. "+4ms", "Stable", "Above average", "Good" — colored by noteSentiment
  note?: string; // neutral trailing detail appended after noteStat, e.g. " vs. 7-day avg", ": 7.3h sleep" — always gray, include its own leading punctuation/spacing
  noteSentiment?: 'positive' | 'negative' | 'neutral'; // colors noteStat green/red/gray — omit or 'neutral' if noteStat isn't a judgment
  color: FxColor;
}

export interface OverviewData {
  today: DailyVitals; // synced but not yet rendered — Health Auto Export only pushes once/day, so a partial "today" reads as stale until Apple Watch sync lands
  lastSyncedAt: string | null; // ISO timestamp — null in mock mode (never actually synced)
  quickStats: QuickStat[]; // active time + session count, all sports — not run-distance-only
  activityMix: TypeBreakdown[]; // session count by sport
  timeByType: TypeBreakdown[]; // minutes invested by sport
  mileageBySport: TypeBreakdown[]; // total km by sport (strength excluded — no distance to log)
  mileageFunFact: string | null; // illustrative real-world distance comparison; null when not available (live data)
  recoveryMetrics: RecoveryMetric[]; // HRV / resting HR / VO2 max / sleep recovery
}

// ── Activities (broad — Strava/Apple Health shaped, all sport types) ──

export type ActivityType = 'run' | 'ride' | 'swim' | 'walk' | 'strength' | 'cross-train';

export interface Activity {
  id: string;
  date: string; // ISO date
  title: string;
  type: ActivityType;
  durationMin: number;
  distanceKm?: number;
  paceMinPerKm?: number;
  avgHr?: number;
  elevationM?: number;
  calories?: number;
  isPr?: boolean;
}

export interface TypeBreakdown {
  label: string; // sport name, e.g. "Run"
  value: number; // count or minutes, depending on which chart
  color: string;
}

// ── Plan (Google Calendar-shaped schedule) ──────────────

export interface PlanWorkout {
  id: string;
  title: string;
  type: 'run' | 'ride' | 'swim' | 'strength' | 'rest' | 'cross-train';
  durationMin: number;
  intensity: IntensityLevel;
  source: 'calendar' | 'manual';
  note?: string;
  completed: boolean;
}

export interface PlanDay {
  date: string; // ISO date
  dayLabel: string; // "MON"
  dateLabel: string; // "Jul 6"
  isToday: boolean;
  isPast: boolean;
  workouts: PlanWorkout[];
}

export interface UpcomingEvent {
  id: string;
  title: string;
  start: string; // ISO datetime
  durationMin: number;
  calendar: string; // "Training", "Personal", etc.
}

export interface PlanData {
  week: PlanDay[];
  upcoming: UpcomingEvent[];
}
