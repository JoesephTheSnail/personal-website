// Shared shape for the Apple Health workout log written by the health
// webhook (src/app/api/fitness/health-webhook/route.ts) and read back by
// liveData.ts to build Activity[] entries for the Overview aggregates.
//
// Keyed by ISO date so a same-day re-sync from the Shortcut upserts that
// day's entry instead of duplicating or erasing other days' history.

import type { Activity } from './types';

export interface WorkoutLogEntry {
  swimMin?: number;
  swimKm?: number;
  bikeMin?: number;
  bikeKm?: number;
  runMin?: number;
  runKm?: number;
  liftMin?: number;
}

export type WorkoutLog = Record<string, WorkoutLogEntry>;

const SPORTS: Array<{
  minKey: keyof WorkoutLogEntry;
  kmKey?: keyof WorkoutLogEntry;
  type: Activity['type'];
  title: string;
}> = [
  { minKey: 'swimMin', kmKey: 'swimKm', type: 'swim', title: 'Swim' },
  { minKey: 'bikeMin', kmKey: 'bikeKm', type: 'ride', title: 'Ride' },
  { minKey: 'runMin', kmKey: 'runKm', type: 'run', title: 'Run' },
  { minKey: 'liftMin', type: 'strength', title: 'Weight Lifting' },
];

// One Activity per logged sport per day — a day with a swim and a run
// produces two entries, matching how Strava/HealthKit would report them
// as separate sessions.
export function workoutLogToActivities(log: WorkoutLog): Activity[] {
  const activities: Activity[] = [];
  for (const [date, entry] of Object.entries(log)) {
    for (const sport of SPORTS) {
      const durationMin = entry[sport.minKey];
      if (durationMin === undefined || durationMin <= 0) continue;
      activities.push({
        id: `${date}-${sport.type}`,
        date,
        title: sport.title,
        type: sport.type,
        durationMin,
        distanceKm: sport.kmKey ? entry[sport.kmKey] : undefined,
      });
    }
  }
  return activities.sort((a, b) => (a.date < b.date ? 1 : -1));
}
