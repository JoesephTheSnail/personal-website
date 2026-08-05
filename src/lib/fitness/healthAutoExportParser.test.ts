import { describe, it, expect } from 'vitest';
import { parseHealthAutoExport } from './healthAutoExportParser';

function payload(metrics: unknown[] = [], workouts: unknown[] = []) {
  return { data: { metrics, workouts } };
}

describe('parseHealthAutoExport — vitals', () => {
  it('reads steps from the latest data point', () => {
    const result = parseHealthAutoExport(payload([
      { name: 'step_count', data: [{ date: '2026-01-01', qty: 1000 }, { date: '2026-01-02', qty: 8420 }] },
    ]));
    expect(result.vitals.steps).toBe(8420);
  });

  it('distinguishes resting heart rate from average heart rate', () => {
    const result = parseHealthAutoExport(payload([
      { name: 'heart_rate', data: [{ date: '2026-01-01', Avg: 88 }] },
      { name: 'resting_heart_rate', data: [{ date: '2026-01-01', Avg: 54 }] },
    ]));
    expect(result.vitals.heartRateAvg).toBe(88);
    expect(result.vitals.heartRateResting).toBe(54);
  });

  it('converts kg to lbs for weight, but leaves lbs untouched', () => {
    const kg = parseHealthAutoExport(payload([
      { name: 'weight_body_mass', units: 'kg', data: [{ date: '2026-01-01', qty: 77.7 }] },
    ]));
    expect(kg.vitals.weightLbs).toBeCloseTo(171.3, 0);

    const lbs = parseHealthAutoExport(payload([
      { name: 'weight_body_mass', units: 'lb', data: [{ date: '2026-01-01', qty: 171.4 }] },
    ]));
    expect(lbs.vitals.weightLbs).toBe(171.4);
  });

  it('treats a sleep value over 24 as minutes and converts to hours', () => {
    const hours = parseHealthAutoExport(payload([
      { name: 'sleep_analysis', data: [{ date: '2026-01-01', asleep: 7.3 }] },
    ]));
    expect(hours.vitals.sleepHours).toBe(7.3);

    const minutes = parseHealthAutoExport(payload([
      { name: 'sleep_analysis', data: [{ date: '2026-01-01', asleep: 438 }] },
    ]));
    expect(minutes.vitals.sleepHours).toBeCloseTo(7.3, 1);
  });

  it('reports unrecognized metric names as unmatched instead of silently dropping them', () => {
    const result = parseHealthAutoExport(payload([
      { name: 'some_future_metric_apple_invents', data: [{ date: '2026-01-01', qty: 1 }] },
    ]));
    expect(result.unmatched).toContain('some_future_metric_apple_invents');
    expect(result.matched).toHaveLength(0);
  });
});

describe('parseHealthAutoExport — workouts', () => {
  it('maps a variety of workout names to the five known sports', () => {
    const result = parseHealthAutoExport(payload([], [
      { name: 'Running', start: '2026-01-01 08:00:00 +0000', duration: 1500 },
      { name: 'Traditional Strength Training', start: '2026-01-01 09:00:00 +0000', duration: 3000 },
      { name: 'Cycling', start: '2026-01-02 08:00:00 +0000', duration: 4200 },
    ]));
    expect(result.workouts.map((w) => w.sport)).toEqual(['run', 'strength', 'ride']);
  });

  it('converts distance from miles to km, and leaves km as-is', () => {
    const result = parseHealthAutoExport(payload([], [
      { name: 'Running', start: '2026-01-01 08:00:00 +0000', duration: 1500, distance: { qty: 3.1, units: 'mi' } },
      { name: 'Running', start: '2026-01-02 08:00:00 +0000', duration: 1500, distance: { qty: 5, units: 'km' } },
    ]));
    expect(result.workouts[0].distanceKm).toBeCloseTo(4.99, 1);
    expect(result.workouts[1].distanceKm).toBe(5);
  });

  it('drops a workout with no recognizable sport rather than mis-bucketing it', () => {
    const result = parseHealthAutoExport(payload([], [
      { name: 'Mind and Body', start: '2026-01-01 08:00:00 +0000', duration: 600 },
    ]));
    expect(result.workouts).toHaveLength(0);
    expect(result.unmatched).toContain('Mind and Body');
  });

  it('drops a workout missing a valid date or duration instead of throwing', () => {
    const result = parseHealthAutoExport(payload([], [
      { name: 'Running', start: 'not-a-date', duration: 1500 },
      { name: 'Running', start: '2026-01-01 08:00:00 +0000', duration: 'oops' },
    ]));
    expect(result.workouts).toHaveLength(0);
  });
});
